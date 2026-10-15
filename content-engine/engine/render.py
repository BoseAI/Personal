"""Monta il video verticale con FFmpeg: scene con zoom lento, voce, sottotitoli parola per parola."""

import random
import subprocess
from pathlib import Path

from . import config

PAD = 0.25  # respiro tra una scena e l'altra (secondi)


def _run(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def scene_clip(image: Path, audio: Path, duration: float, out: Path, zoom_in: bool) -> Path:
    frames = int((duration + PAD) * config.FPS)
    w, h = config.WIDTH, config.HEIGHT
    z = f"min(1+0.06*on/{frames},1.06)" if zoom_in else f"max(1.06-0.06*on/{frames},1.0)"
    vf = (
        f"scale={int(w * 1.5)}:{int(h * 1.5)},"
        f"zoompan=z='{z}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={frames}:s={w}x{h}:fps={config.FPS},"
        "format=yuv420p"
    )
    _run([
        "-loop", "1", "-i", str(image), "-i", str(audio),
        "-vf", vf, "-af", f"apad=pad_dur={PAD},aresample=44100",
        "-t", f"{duration + PAD:.3f}", "-r", str(config.FPS),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ac", "2", str(out),
    ])
    return out


def _ass_time(t: float) -> str:
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"


def write_subtitles(words: list[dict], out: Path, max_words: int = 3) -> Path:
    """Sottotitoli a gruppi di poche parole, con la parola detta evidenziata (stile Shorts)."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {config.WIDTH}
PlayResY: {config.HEIGHT}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{config.FONT_NAME},92,&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,-1,0,0,0,100,100,0,0,1,7,3,2,70,70,560,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    groups = [words[i : i + max_words] for i in range(0, len(words), max_words)]
    for gi, group in enumerate(groups):
        group_end = groups[gi + 1][0]["start"] if gi + 1 < len(groups) else group[-1]["end"] + 0.3
        for wi, w in enumerate(group):
            end = group[wi + 1]["start"] if wi + 1 < len(group) else group_end
            text = " ".join(
                ("{\\c&H00D7FF&}" + x["word"].upper() + "{\\c&HFFFFFF&}") if xi == wi else x["word"].upper()
                for xi, x in enumerate(group)
            )
            lines.append(f"Dialogue: 0,{_ass_time(w['start'])},{_ass_time(max(end, w['start'] + 0.05))},Sub,,0,0,0,,{text}")
    out.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
    return out


def _pick_music() -> Path | None:
    if not config.MUSIC_DIR.exists():
        return None
    tracks = [p for p in config.MUSIC_DIR.iterdir() if p.suffix.lower() in {".mp3", ".m4a", ".wav", ".ogg"}]
    return random.choice(tracks) if tracks else None


def assemble(clips: list[Path], subtitles: Path, out: Path) -> Path:
    work = out.parent
    concat_list = work / "clips.txt"
    concat_list.write_text("".join(f"file '{c.resolve().as_posix()}'\n" for c in clips), encoding="utf-8")
    joined = work / "joined.mp4"
    _run(["-f", "concat", "-safe", "0", "-i", str(concat_list), "-c", "copy", str(joined)])

    # il filtro subtitles vuole un percorso con i caratteri speciali protetti
    sub_path = str(subtitles).replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
    vf = f"subtitles='{sub_path}'"
    music = _pick_music()
    if music:
        _run([
            "-i", str(joined), "-stream_loop", "-1", "-i", str(music),
            "-filter_complex", f"[0:v]{vf}[v];[1:a]volume=0.10[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", str(out),
        ])
    else:
        _run([
            "-i", str(joined), "-vf", vf,
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "copy",
            "-movflags", "+faststart", str(out),
        ])
    joined.unlink(missing_ok=True)
    return out
