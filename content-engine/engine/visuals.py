"""Disegna le schede verticali di ogni scena (sfondo, titolo grande, marchio del canale)."""

import hashlib
import textwrap
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

from . import config

PALETTES = [
    ((12, 14, 40), (64, 24, 120), (255, 196, 0)),
    ((6, 30, 40), (0, 110, 120), (255, 90, 95)),
    ((25, 10, 30), (140, 20, 70), (80, 220, 255)),
    ((10, 20, 15), (20, 100, 60), (255, 230, 80)),
    ((20, 20, 20), (70, 70, 90), (0, 230, 160)),
]


def _font(size: int) -> ImageFont.FreeTypeFont:
    for path in config.FONT_CANDIDATES:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)


def palette_for(seed: str):
    return PALETTES[int(hashlib.md5(seed.encode()).hexdigest(), 16) % len(PALETTES)]


def _background(top, bottom, accent) -> Image.Image:
    w, h = config.WIDTH, config.HEIGHT
    img = Image.new("RGB", (w, h), top)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        k = y / h
        draw.line([(0, y), (w, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * k) for i in range(3)))
    # due bagliori sfocati per dare profondità
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse([-200, 250, 700, 1150], fill=tuple(c // 3 for c in accent))
    g.ellipse([500, 1100, 1400, 2000], fill=tuple(c // 4 for c in bottom))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    return ImageChops.add(img, glow)


def render_scene(headline: str, index: int, total: int, seed: str, out: Path) -> Path:
    top, bottom, accent = palette_for(seed)
    img = _background(top, bottom, accent)
    draw = ImageDraw.Draw(img)
    w = config.WIDTH

    # marchio in alto
    brand = _font(44)
    draw.rounded_rectangle([60, 140, 60 + draw.textlength(config.CHANNEL_NAME, font=brand) + 60, 220],
                           radius=40, fill=accent)
    draw.text((90, 152), config.CHANNEL_NAME, font=brand, fill=top)

    # titolo della scena, grande, nella parte alta (i sottotitoli stanno sotto)
    headline = headline.upper().strip()
    size = 120 if index == 0 else 104
    font = _font(size)
    lines = textwrap.wrap(headline, width=max(8, int(17 * 104 / size))) or [""]
    while len(lines) > 4 and size > 70:
        size -= 8
        font = _font(size)
        lines = textwrap.wrap(headline, width=int(17 * 104 / size))
    y = 520 - (len(lines) * size * 1.15) / 2 + 120
    for i, line in enumerate(lines):
        tw = draw.textlength(line, font=font)
        x = (w - tw) / 2
        color = accent if i == len(lines) - 1 and len(lines) > 1 else (255, 255, 255)
        draw.text((x + 6, y + 6), line, font=font, fill=(0, 0, 0))
        draw.text((x, y), line, font=font, fill=color)
        y += size * 1.15

    # barra di avanzamento delle scene
    gap, bar_y = 14, 110
    seg = (w - 120 - gap * (total - 1)) / total
    for i in range(total):
        x0 = 60 + i * (seg + gap)
        draw.rounded_rectangle([x0, bar_y, x0 + seg, bar_y + 12], radius=6,
                               fill=accent if i <= index else (90, 90, 110))

    img.save(out)
    return out

