# -*- coding: utf-8 -*-
"""Bake a name-plaque onto the «मात्रा टोकरी» basket art (both layers), as in the developer's reference
(2026-10-22): a wooden frame, a cream panel and two brass rivets on the basket's woven front. The matra itself
is NOT in the art - the game draws it on the plaque (.basket-matra), so it can change with the round.

Source: 1_SPEC/art_src/tokri_basket_v1/mt_basket.webp, mt_basket_front.webp (the art before the plaque)
Output: 3_BUILD/assets/UI/mt_basket.webp, mt_basket_front.webp (same size, 372 x 279; the plaque is drawn at
        the same place on both, so the two layers stay in register)

Run:  PYTHONUTF8=1 python 1_SPEC/make_tokri_plaque.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, "1_SPEC", "art_src", "tokri_basket_v1")
OUT = os.path.join(HERE, "3_BUILD", "assets", "UI")
SS = 4                                   # supersampling
CX, CY, W, H = 186, 210, 150, 94         # plaque centre and size, art px (the art is 372 x 279)


def plaque(size):
    w, h = W * SS, H * SS
    lay = Image.new("RGBA", (size[0] * SS, size[1] * SS), (0, 0, 0, 0))
    x0, y0 = CX * SS - w // 2, CY * SS - h // 2
    # soft contact shadow under the plaque
    sh = Image.new("RGBA", lay.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0 + 2 * SS, y0 + 5 * SS, x0 + w + 2 * SS, y0 + h + 5 * SS),
                                         radius=22 * SS, fill=(40, 18, 4, 120))
    lay = Image.alpha_composite(lay, sh.filter(ImageFilter.GaussianBlur(4 * SS)))
    d = ImageDraw.Draw(lay)
    # the wooden frame: dark outline, warm wood, a lighter top band
    d.rounded_rectangle((x0, y0, x0 + w, y0 + h), radius=22 * SS, fill=(92, 46, 18, 255))
    d.rounded_rectangle((x0 + 3 * SS, y0 + 3 * SS, x0 + w - 3 * SS, y0 + h - 3 * SS), radius=19 * SS,
                        fill=(201, 116, 46, 255))
    d.rounded_rectangle((x0 + 5 * SS, y0 + 5 * SS, x0 + w - 5 * SS, y0 + h * 0.45), radius=16 * SS,
                        fill=(226, 150, 78, 255))
    d.rounded_rectangle((x0 + 5 * SS, y0 + h * 0.45, x0 + w - 5 * SS, y0 + h - 5 * SS), radius=16 * SS,
                        fill=(190, 104, 40, 255))
    # the cream panel, with a thin dark inner edge
    ix0, iy0, ix1, iy1 = x0 + 13 * SS, y0 + 12 * SS, x0 + w - 13 * SS, y0 + h - 12 * SS
    d.rounded_rectangle((ix0, iy0, ix1, iy1), radius=13 * SS, fill=(120, 60, 22, 255))
    d.rounded_rectangle((ix0 + 2 * SS, iy0 + 2 * SS, ix1 - 2 * SS, iy1 - 2 * SS), radius=11 * SS,
                        fill=(255, 247, 228, 255))
    d.rounded_rectangle((ix0 + 2 * SS, iy1 - 14 * SS, ix1 - 2 * SS, iy1 - 2 * SS), radius=11 * SS,
                        fill=(246, 232, 202, 255))
    d.rectangle((ix0 + 4 * SS, iy1 - 16 * SS, ix1 - 4 * SS, iy1 - 12 * SS), fill=(250, 240, 216, 255))
    # two brass rivets on the frame, left and right
    for rx in (x0 + 8 * SS, x0 + w - 8 * SS):
        r = 4 * SS
        d.ellipse((rx - r - SS, CY * SS - r - SS, rx + r + SS, CY * SS + r + SS), fill=(92, 52, 20, 255))
        d.ellipse((rx - r, CY * SS - r, rx + r, CY * SS + r), fill=(214, 176, 96, 255))
        d.ellipse((rx - r // 2 - SS, CY * SS - r // 2 - SS, rx + r // 3, CY * SS + r // 3), fill=(246, 224, 160, 255))
    return lay.resize(size, Image.LANCZOS)


for name in ("mt_basket.webp", "mt_basket_front.webp"):
    art = Image.open(os.path.join(SRC, name)).convert("RGBA")
    pl = plaque(art.size)
    out = Image.alpha_composite(art, pl)
    # the plaque never widens the basket's silhouette: keep the art's own alpha outside it
    out.putalpha(Image.composite(out.getchannel("A"), art.getchannel("A"), pl.getchannel("A").point(lambda v: 255 if v > 0 else 0)))
    out.save(os.path.join(OUT, name), "WEBP", quality=92, alpha_quality=100, method=6)
    print("  wrote", name, out.size)
