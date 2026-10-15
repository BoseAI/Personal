"""Caricamento su YouTube con la Data API v3 (gratuita) tramite upload ripristinabile."""

import json
from pathlib import Path

import requests

from . import config

TOKEN_URL = "https://oauth2.googleapis.com/token"
UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"


def _access_token() -> str:
    missing = [n for n in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN") if not getattr(config, n)]
    if missing:
        raise RuntimeError(f"Mancano le credenziali YouTube: {', '.join(missing)} (vedi README)")
    resp = requests.post(TOKEN_URL, data={
        "client_id": config.YT_CLIENT_ID,
        "client_secret": config.YT_CLIENT_SECRET,
        "refresh_token": config.YT_REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["access_token"]


def upload(video: Path, script: dict, publish_at: str | None = None) -> str:
    token = _access_token()
    hashtags = " ".join(script.get("hashtags", []))
    description = f"{script['description']}\n\n"
    if script.get("source_link"):
        description += f"Fonte: {script['source_link']}\n\n"
    description += hashtags

    status = {"privacyStatus": config.YT_PRIVACY, "selfDeclaredMadeForKids": False}
    if publish_at:  # la programmazione richiede privacyStatus=private
        status.update(privacyStatus="private", publishAt=publish_at)

    metadata = {
        "snippet": {
            "title": script["title"][:100],
            "description": description[:5000],
            "tags": script.get("tags", [])[:15],
            "categoryId": config.YT_CATEGORY,
            "defaultLanguage": "it",
            "defaultAudioLanguage": "it",
        },
        "status": status,
    }
    init = requests.post(
        UPLOAD_URL,
        params={"uploadType": "resumable", "part": "snippet,status"},
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=UTF-8",
            "X-Upload-Content-Type": "video/mp4",
            "X-Upload-Content-Length": str(video.stat().st_size),
        },
        data=json.dumps(metadata),
        timeout=60,
    )
    init.raise_for_status()
    with open(video, "rb") as f:
        resp = requests.put(init.headers["Location"], data=f,
                            headers={"Authorization": f"Bearer {token}", "Content-Type": "video/mp4"},
                            timeout=600)
    resp.raise_for_status()
    video_id = resp.json()["id"]
    return f"https://youtube.com/shorts/{video_id}"
