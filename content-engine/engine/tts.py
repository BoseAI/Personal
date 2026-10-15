"""Voce gratuita con edge-tts, con i tempi di ogni parola per i sottotitoli."""

import asyncio
import subprocess
from pathlib import Path

from . import config


def audio_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(out.stdout.strip())


async def _speak(text: str, out: Path) -> list[dict]:
    import edge_tts

    words = []
    comm = edge_tts.Communicate(text, config.VOICE, rate=config.VOICE_RATE, boundary="WordBoundary")
    with open(out, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7  # unità da 100 ns
                words.append({"word": chunk["text"], "start": start, "end": start + chunk["duration"] / 1e7})
    return words


def _silence(text: str, out: Path) -> list[dict]:
    """Modalità offline: audio muto con durata stimata, per provare il montaggio senza rete."""
    words = text.split()
    duration = max(2.0, len(text) / 15)
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
         "-t", f"{duration:.2f}", "-c:a", "libmp3lame", str(out)],
        check=True,
    )
    return proportional_timings(words, duration)


def proportional_timings(words: list[str], duration: float) -> list[dict]:
    total = sum(len(w) + 1 for w in words) or 1
    t, timings = 0.0, []
    for w in words:
        d = duration * (len(w) + 1) / total
        timings.append({"word": w, "start": t, "end": t + d})
        t += d
    return timings


def synthesize(text: str, out: Path, offline: bool = False) -> tuple[float, list[dict]]:
    """Ritorna (durata, parole con tempi relativi all'inizio della clip)."""
    if offline:
        words = _silence(text, out)
    else:
        words = asyncio.run(_speak(text, out))
    duration = audio_duration(out)
    if not words:  # nessun evento parola: distribuisco i tempi sulla lunghezza
        words = proportional_timings(text.split(), duration)
    return duration, words
