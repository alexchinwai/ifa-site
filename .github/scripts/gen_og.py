# -*- coding: utf-8 -*-
"""Generate per-page OG cards (1200x630) for fqadulting.com — navy + gold, Songti TC."""
from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = os.path.join(os.path.dirname(__file__), "..", "..", "assets")
ASSETS = os.path.abspath(ASSETS)
NAVY = (21, 35, 63); WHITE = (255, 255, 255); GOLD = (154, 143, 111); SOFT = (150, 160, 184)
W, H = 1200, 630
FONT = "/System/Library/Fonts/Songti.ttc"   # Songti TC: bold=index 2, regular=index 7

def font(size, bold=True):
    try:
        return ImageFont.truetype(FONT, size, index=(2 if bold else 7))
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Songti.ttc", size, index=(2 if bold else 7))

def wrap(text, n):
    return [text[i:i+n] for i in range(0, len(text), n)]

CARDS = {
    "og-home":      "成為懂理財的大人",
    "og-emergency": "應急錢應該存多少?",
    "og-mpf":       "強積金是什麼?初級大人要看什麼",
    "og-start-here":"初級大人的六步財務地基",
    "og-guide":     "初級大人理財起步指南",
    "og-checkup":   "資產配置自我體檢",
    "og-topic-compounding": "複利:愈早開始愈好",
    "og-topic-inflation": "通脹如何蠶食你的現金",
    "og-topic-paycheck-to-paycheck": "月光族怎樣開始儲錢?",
    "og-compare-advice": "理財建議的三條路怎樣選",
    "og-compare-savings": "儲蓄保險與定存+自行投資怎樣選",
}

for key, title in CARDS.items():
    img = Image.new("RGB", (W, H), NAVY)
    d = ImageDraw.Draw(img)
    # hairline frame
    d.rectangle([40, 40, W-40, H-40], outline=(54, 68, 96), width=1)
    # monogram FQ. top-left
    fmono = font(64, True)
    d.text((80, 78), "FQ", font=fmono, fill=WHITE)
    bb = d.textbbox((80, 78), "FQ", font=fmono)
    d.text((bb[2]+4, 78), ".", font=fmono, fill=GOLD)
    # title (wrapped, large, centered vertically-ish)
    lines = wrap(title, 11)
    fs = 88 if len(lines) <= 1 else (76 if len(lines) == 2 else 64)
    ft = font(fs, True)
    lh = int(fs * 1.34)
    total = lh * len(lines)
    y = (H - total) // 2 + 20
    for ln in lines:
        d.text((80, y), ln, font=ft, fill=WHITE)
        y += lh
    # footer brand line
    fsub = font(26, False)
    d.text((80, H-110), "初級大人的財商進化學院", font=fsub, fill=SOFT)
    flat = font(20, False)
    d.text((80, H-72), "FQ ADULTING · 香港財商教育", font=flat, fill=GOLD)
    out = os.path.join(ASSETS, key + ".png")
    img.save(out, "PNG")
    print("wrote", key + ".png", img.size)
