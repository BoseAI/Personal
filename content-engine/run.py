"""Crea uno Short dall'inizio alla fine.

Esempi:
  python content-engine/run.py                       # trend del giorno -> video
  python content-engine/run.py --topic "Gemini 3"    # argomento scelto da te
  python content-engine/run.py --script mio.json     # usa uno script già scritto
  python content-engine/run.py --offline             # prova del montaggio senza rete
  python content-engine/run.py --upload              # carica anche su YouTube
"""

import argparse
import json
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine import config, render, script_gen, trends, tts, visuals  # noqa: E402

EXAMPLE = Path(__file__).resolve().parent / "examples" / "script_esempio.json"


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:50] or "video"


def main() -> None:
    ap = argparse.ArgumentParser(description="Motore di Shorts automatici")
    ap.add_argument("--topic", help="argomento da trattare al posto dei trend")
    ap.add_argument("--script", type=Path, help="file JSON con uno script già pronto")
    ap.add_argument("--offline", action="store_true", help="niente rete: script d'esempio e audio muto")
    ap.add_argument("--upload", action="store_true", help="carica su YouTube a fine montaggio")
    ap.add_argument("--publish-at", help="data ISO di pubblicazione programmata, es. 2026-10-16T17:00:00Z")
    ap.add_argument("--keep-work", action="store_true", help="conserva i file intermedi")
    args = ap.parse_args()

    # 1. script
    if args.script or args.offline:
        path = args.script or EXAMPLE
        print(f"1/4 Script da {path}")
        script = script_gen.validate(json.loads(path.read_text(encoding="utf-8")))
    else:
        candidates = [] if args.topic else trends.fetch_candidates()
        print(f"1/4 Trend trovati: {len(candidates)}")
        for c in candidates[:5]:
            print(f"    · {c['title']}")
        script = script_gen.generate(candidates, topic=args.topic)
    print(f"    Titolo: {script['title']}")

    out_dir = config.OUTPUT_DIR / f"{datetime.now():%Y-%m-%d_%H%M}_{slugify(script['title'])}"
    work = out_dir / "work"
    work.mkdir(parents=True, exist_ok=True)
    (out_dir / "script.json").write_text(json.dumps(script, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2. voce + 3. immagini
    print("2/4 Voce e grafica delle scene")
    clips, all_words, t = [], [], 0.0
    total = len(script["scenes"])
    for i, scene in enumerate(script["scenes"]):
        audio = work / f"scene_{i:02d}.mp3"
        duration, words = tts.synthesize(scene["text"], audio, offline=args.offline)
        image = visuals.render_scene(scene["headline"] or scene["text"][:40], i, total,
                                     script["title"], work / f"scene_{i:02d}.png")
        clips.append(render.scene_clip(image, audio, duration, work / f"scene_{i:02d}.mp4", zoom_in=i % 2 == 0))
        all_words += [{**w, "start": w["start"] + t, "end": w["end"] + t} for w in words]
        t += duration + render.PAD
        print(f"    scena {i + 1}/{total}: {duration:.1f}s")

    # 4. montaggio finale
    print(f"3/4 Montaggio ({t:.1f}s)")
    subs = render.write_subtitles(all_words, work / "subs.ass")
    video = render.assemble(clips, subs, out_dir / "video.mp4")
    (out_dir / "descrizione.txt").write_text(
        f"{script['title']}\n\n{script['description']}\n\n{' '.join(script.get('hashtags', []))}\n",
        encoding="utf-8",
    )
    if not args.keep_work:
        shutil.rmtree(work)
    print(f"    Video pronto: {video}")

    # upload
    url = None
    if args.upload:
        from engine import upload

        print("4/4 Caricamento su YouTube")
        url = upload.upload(video, script, publish_at=args.publish_at)
        print(f"    Caricato: {url} (stato: {config.YT_PRIVACY})")
    else:
        print("4/4 Caricamento saltato (usa --upload)")

    if not args.offline and not args.script:
        trends.save_history({
            "date": datetime.now().isoformat(timespec="minutes"),
            "title": script["title"],
            "source_title": script.get("source_title", ""),
            "url": url,
        })


if __name__ == "__main__":
    main()
