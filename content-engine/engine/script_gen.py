"""Sceglie la notizia migliore e scrive lo script dello Short con l'API gratuita di Gemini."""

import json
import re

import requests

from . import config
from .trends import load_history

PROMPT = """Sei l'autore del canale YouTube Shorts "{channel}" ({niche}).
Pubblico: italiani curiosi, non tecnici. Tono: diretto, energico, mai clickbait falso.

Notizie disponibili oggi (usa SOLO i fatti presenti qui, non inventare numeri o dettagli):
{candidates}

Argomenti già trattati di recente (non ripeterli):
{history}

{topic_hint}

Scegli UNA notizia, la più interessante e utile per il pubblico italiano, e scrivi lo script di uno
Short da 40-55 secondi parlati (circa 110-140 parole in totale).
Struttura: hook fortissimo nei primi 2 secondi, poi spiegazione semplice, poi perché conta per chi guarda,
chiusura con una domanda per i commenti. Varia sempre struttura e attacco rispetto ai video precedenti.

Rispondi SOLO con JSON valido, senza markdown, con questo schema:
{{
  "source_title": "titolo esatto della notizia scelta",
  "source_link": "link della notizia",
  "title": "titolo YouTube in italiano, max 70 caratteri",
  "scenes": [
    {{"headline": "2-5 parole a schermo", "text": "frase parlata della scena"}}
  ],
  "description": "descrizione YouTube di 2-3 frasi",
  "hashtags": ["#shorts", "#tecnologia", "..."],
  "tags": ["parola chiave", "..."]
}}
Le scene devono essere 5-7. Scrivi i numeri in lettere se sono brevi, così la voce li legge bene."""


def _extract_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.MULTILINE).strip()
    start, end = text.find("{"), text.rfind("}")
    return json.loads(text[start : end + 1])


def validate(script: dict) -> dict:
    for field in ("title", "scenes", "description"):
        if not script.get(field):
            raise ValueError(f"script senza campo '{field}'")
    script["scenes"] = [s for s in script["scenes"] if s.get("text", "").strip()]
    if len(script["scenes"]) < 3:
        raise ValueError("script con meno di 3 scene")
    for s in script["scenes"]:
        s.setdefault("headline", "")
    script["title"] = script["title"][:95]
    script.setdefault("hashtags", ["#shorts"])
    script.setdefault("tags", [])
    return script


def generate(candidates: list[dict], topic: str | None = None) -> dict:
    if not config.GEMINI_API_KEY:
        raise RuntimeError("Manca GEMINI_API_KEY (gratis su https://aistudio.google.com/apikey)")

    cand_text = "\n".join(
        f"- {c['title']} | {c['summary']} | {c['link']}" for c in candidates
    ) or "(nessuna notizia: usa l'argomento indicato)"
    history = "\n".join(f"- {h['title']}" for h in load_history()[-30:]) or "(nessuno)"
    topic_hint = f"Argomento richiesto dall'autore: {topic}" if topic else ""

    prompt = PROMPT.format(
        channel=config.CHANNEL_NAME, niche=config.NICHE,
        candidates=cand_text, history=history, topic_hint=topic_hint,
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.GEMINI_MODEL}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.9, "responseMimeType": "application/json"},
    }
    last_error = None
    for _ in range(3):
        resp = requests.post(url, params={"key": config.GEMINI_API_KEY}, json=body, timeout=120)
        if resp.status_code != 200:
            last_error = f"Gemini HTTP {resp.status_code}: {resp.text[:300]}"
            continue
        try:
            text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
            return validate(_extract_json(text))
        except (KeyError, IndexError, ValueError) as exc:
            last_error = f"risposta non valida: {exc}"
    raise RuntimeError(last_error)
