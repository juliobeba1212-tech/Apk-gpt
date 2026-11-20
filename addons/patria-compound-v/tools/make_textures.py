#!/usr/bin/env python3
"""
Pátria: Compound V — texturas-item (pixel art 16x16) com preview em checkerboard.
"""
import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RP_ITEMS = os.path.join(ROOT, "Patria_RP", "textures", "items")
ASSETS = os.path.join(ROOT, "assets")
os.makedirs(RP_ITEMS, exist_ok=True)

T = (0, 0, 0, 0)  # transparente
K = (23, 23, 30, 255)      # contorno
N = (240, 243, 247, 255)   # agulha
G = (233, 186, 60, 255)    # ouro
GH = (250, 222, 120, 255)  # ouro claro
GD = (150, 110, 28, 255)   # ouro escuro
M = (160, 172, 184, 255)   # metal
MH = (205, 216, 226, 255)  # metal claro
GL = (215, 226, 235, 255)  # vidro claro
GM = (164, 179, 192, 255)  # vidro médio
GDX = (109, 123, 137, 255) # vidro sombra
R = (198, 20, 33, 255)     # Compound V (vermelho)
RH = (255, 84, 84, 255)    # vermelho claro
RD = (128, 10, 20, 255)    # vermelho escuro
W = (246, 248, 252, 255)   # branco


def fill(px, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if 0 <= x < 16 and 0 <= y < 16:
                px[x, y] = c


def draw_syringe() -> Image.Image:
    """Seringa Compound V na horizontal — leitura máxima em 16x16."""
    img = Image.new("RGBA", (16, 16), T)
    px = img.load()

    # ---------- capa do êmbolo (polegar) ----------
    fill(px, 0, 5, 1, 10, K)
    px[0, 6] = G; px[0, 7] = GH; px[0, 8] = GH; px[0, 9] = G
    px[1, 6] = GD; px[1, 7] = G; px[1, 8] = G; px[1, 9] = GD

    # ---------- haste do êmbolo ----------
    fill(px, 1, 7, 3, 8, M)
    px[2, 7] = MH; px[3, 7] = MH
    px[2, 8] = (120, 130, 142, 255)

    # ---------- cilindro de vidro ----------
    for x in range(3, 9):
        px[x, 5] = K; px[x, 10] = K
    px[3, 6] = K; px[3, 9] = K
    # vidro: linha superior clara (reflexo)
    px[4, 6] = GL; px[5, 6] = GL; px[6, 6] = GL; px[7, 6] = GM; px[8, 6] = GDX
    # meio: gradiente de sombra
    px[4, 7] = GL; px[5, 7] = GM; px[6, 7] = GM; px[7, 7] = GDX; px[8, 7] = GDX
    # líquido Compound V (metade inferior)
    px[4, 8] = RH; px[5, 8] = R; px[6, 8] = R; px[7, 8] = RH; px[8, 8] = RD
    px[3, 7] = GL; px[3, 8] = GDX; px[8, 8] = RD
    px[4, 9] = RD; px[5, 9] = RD; px[6, 9] = R; px[7, 9] = RD; px[8, 9] = RD
    px[3, 9] = K if False else RD

    # ---------- flange (apoio dos dedos) ----------
    fill(px, 9, 4, 10, 11, K)
    for y in range(5, 11):
        px[9, y] = M
        px[10, y] = MH
    px[9, 4] = K; px[10, 4] = K; px[9, 11] = K; px[10, 11] = K

    # ---------- conector (hub) dourado ----------
    fill(px, 11, 6, 12, 9, K)
    px[11, 7] = G; px[12, 7] = GH; px[11, 8] = G; px[12, 8] = G

    # ---------- agulha ----------
    px[13, 7] = N; px[14, 7] = N; px[15, 7] = W
    px[13, 8] = (140, 148, 158, 255); px[14, 8] = (140, 148, 158, 255)

    return img


def star_points(cx, cy, r_out, r_in, n=5, rot=-math.pi / 2):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        a = rot + i * math.pi / n
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def point_in_polygon(x, y, poly):
    inside = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def draw_emblem() -> Image.Image:
    """Emblema Compound V: medalhão dourado + estrela branca sobre campo naval."""
    img = Image.new("RGBA", (16, 16), T)
    cx = cy = 7.5
    OUT = K
    GOLD_L = (248, 214, 106, 255)
    GOLD = (216, 168, 56, 255)
    GOLD_D = (140, 100, 22, 255)
    NAVY_L = (45, 70, 108, 255)
    NAVY = (27, 43, 72, 255)
    NAVY_D = (15, 24, 43, 255)

    poly = star_points(cx, cy + 0.35, 3.05, 1.22)

    for y in range(16):
        for x in range(16):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            d = math.hypot(dx, dy)
            if d > 7.45:
                continue
            if d > 6.75:
                c = OUT                      # contorno externo
            elif d > 5.35:
                t = -(dx * 0.65 + dy * 0.75)  # luz vinda de cima-esquerda
                if t > 0.6:
                    c = GOLD_L
                elif t > -1.2:
                    c = GOLD
                else:
                    c = GOLD_D
            elif d > 4.95:
                c = OUT                      # filete interno do anel
            else:
                g = (-(dx * 0.5 + dy * 0.65) + 5.2) / 10.4
                c = NAVY_L if g > 0.66 else (NAVY if g > 0.34 else NAVY_D)
                if point_in_polygon(x + 0.5, y + 0.5, poly):
                    c = W if (-(dx * 0.65 + dy * 0.75)) < 1.0 else (176, 188, 202, 255)
            img.putpixel((x, y), c)
    return img


def checker(size, cell=8):
    bg = Image.new("RGB", (size, size), (58, 58, 66))
    d = ImageDraw.Draw(bg)
    for y in range(0, size, cell):
        for x in range(0, size, cell):
            if (x // cell + y // cell) % 2 == 0:
                d.rectangle([x, y, x + cell - 1, y + cell - 1], fill=(44, 44, 52))
    return bg


def save_icon_views(img, name):
    out = os.path.join(RP_ITEMS, f"{name}.png")
    img.save(out)
    S = img.width * 16
    big = img.resize((S, S), Image.NEAREST)
    bg = checker(S).convert("RGBA")
    bg.alpha_composite(big)
    bg.convert("RGB").save(os.path.join(ASSETS, f"{name}_preview.png"))
    print("saved", out)


if __name__ == "__main__":
    save_icon_views(draw_syringe(), "compound_v")
    save_icon_views(draw_emblem(), "compound_v_emblem")
