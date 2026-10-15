"""Raccoglie le notizie del momento da feed RSS gratuiti e le ordina per pertinenza."""

import json
import re
import time
from datetime import datetime, timezone

import feedparser

from . import config

FEEDS = [
    # Google News Italia, sezione tecnologia
    "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=it&gl=IT&ceid=IT:it",
    # Ricerche in crescita in Italia
    "https://trends.google.com/trending/rss?geo=IT",
    # Fonti internazionali su AI (arrivano prima delle italiane)
    "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml",
    "https://techcrunch.com/category/artificial-intelligence/feed/",
]


def _clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", " ", text or "")
    return re.sub(r"\s+", " ", text).strip()


def _score(title: str, summary: str, published: float | None) -> float:
    blob = f"{title} {summary}".lower()
    score = sum(2.0 for kw in config.NICHE_KEYWORDS if re.search(rf"\b{re.escape(kw)}\b", blob))
    if published:
        hours = (time.time() - published) / 3600
        score += max(0.0, 3.0 - hours / 12)  # più fresca = meglio
    return score


def load_history() -> list[dict]:
    if config.HISTORY_FILE.exists():
        return json.loads(config.HISTORY_FILE.read_text(encoding="utf-8"))
    return []


def save_history(entry: dict) -> None:
    history = load_history()
    history.append(entry)
    config.HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    config.HISTORY_FILE.write_text(
        json.dumps(history[-200:], ensure_ascii=False, indent=2), encoding="utf-8"
    )


def fetch_candidates(limit: int = 12) -> list[dict]:
    recent_titles = {h.get("source_title", "").lower() for h in load_history()[-60:]}
    seen, items = set(), []
    for url in FEEDS:
        try:
            feed = feedparser.parse(url, agent="Mozilla/5.0 content-engine")
        except Exception as exc:  # un feed rotto non deve fermare tutto
            print(f"  ! feed non leggibile {url}: {exc}")
            continue
        for e in feed.entries[:30]:
            title = _clean(e.get("title", ""))
            key = title.lower()[:80]
            if not title or key in seen or title.lower() in recent_titles:
                continue
            seen.add(key)
            ts = e.get("published_parsed") or e.get("updated_parsed")
            published = time.mktime(ts) if ts else None
            summary = _clean(e.get("summary", ""))[:400]
            items.append({
                "title": title,
                "summary": summary,
                "link": e.get("link", ""),
                "published": datetime.fromtimestamp(published, timezone.utc).isoformat() if published else "",
                "score": _score(title, summary, published),
            })
    items.sort(key=lambda x: x["score"], reverse=True)
    return items[:limit]
