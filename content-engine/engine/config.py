"""Impostazioni del motore di contenuti. Tutto è sovrascrivibile da variabili d'ambiente."""

import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"
DATA_DIR = ROOT / "data"
HISTORY_FILE = DATA_DIR / "history.json"
MUSIC_DIR = ROOT / "assets" / "music"

# Identità del canale
CHANNEL_NAME = os.getenv("CHANNEL_NAME", "AI SPIEGATA")
NICHE = os.getenv(
    "NICHE",
    "intelligenza artificiale, nuovi strumenti tech utili e notizie tecnologiche spiegate in modo semplice",
)
NICHE_KEYWORDS = [
    "ai", "intelligenza artificiale", "chatgpt", "openai", "gemini", "claude", "anthropic",
    "google", "apple", "iphone", "android", "meta", "microsoft", "nvidia", "robot",
    "app", "smartphone", "tesla", "chip", "software", "tecnologia", "deepfake", "cyber",
]

# LLM gratuito (piano free di Google AI Studio)
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Voce gratuita (edge-tts)
VOICE = os.getenv("TTS_VOICE", "it-IT-DiegoNeural")  # alternative: it-IT-IsabellaNeural, it-IT-ElsaNeural
VOICE_RATE = os.getenv("TTS_RATE", "+8%")

# Video verticale
WIDTH, HEIGHT, FPS = 1080, 1920, 30
FONT_NAME = os.getenv("FONT_NAME", "DejaVu Sans")
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]

# YouTube
YT_CLIENT_ID = os.getenv("YT_CLIENT_ID", "")
YT_CLIENT_SECRET = os.getenv("YT_CLIENT_SECRET", "")
YT_REFRESH_TOKEN = os.getenv("YT_REFRESH_TOKEN", "")
# "private" = lo controlli tu in YouTube Studio e lo pubblichi con un tap
YT_PRIVACY = os.getenv("YT_PRIVACY", "private")
YT_CATEGORY = os.getenv("YT_CATEGORY", "28")  # Scienza e tecnologia
