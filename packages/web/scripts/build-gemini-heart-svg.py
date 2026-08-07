"""Generate SVG from detected Gemini heart dots + line tracing."""
from PIL import Image
import math
import json
import os

IMG = r"C:\Users\rafae\Downloads\Gemini_Generated_Image_j1sn5fj1sn5fj1sn.png"
JSON = r"C:\Users\rafae\Documents\Filhos\packages\web\scripts\gemini-heart-dots.json"
OUT = r"C:\Users\rafae\Documents\Filhos\packages\web\public\brand\proposals\heart-gemini-replica.svg"

img = Image.open(IMG).convert("RGB")
w, h = img.size
pixels = img.load()

min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        if r > 40 or g > 40 or b > 40:
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)

pad = 6
box_x1, box_y1 = min_x + pad, min_y + pad
box_x2, box_y2 = max_x - pad, max_y - pad
box_w, box_h = box_x2 - box_x1, box_y2 - box_y1

def is_yellow(x, y):
    if x < 0 or y < 0 or x >= w or y >= h:
        return False
    r, g, b = pixels[x, y]
    return r > 170 and g > 150 and b < 130 and r + g > b + 120

def svg_to_img(sx, sy):
    return box_x1 + sx / 96 * box_w, box_y1 + sy / 88 * box_h

def line_has_yellow(sx1, sy1, sx2, sy2, samples=24):
    x1, y1 = svg_to_img(sx1, sy1)
    x2, y2 = svg_to_img(sx2, sy2)
    hits = 0
    for i in range(samples):
        t = i / (samples - 1)
        x = int(x1 + (x2 - x1) * t)
        y = int(y1 + (y2 - y1) * t)
        if is_yellow(x, y):
            hits += 1
    return hits >= samples * 0.45

with open(JSON) as f:
    dots = json.load(f)["dots"]

# merge very close duplicates
merged = []
for d in sorted(dots, key=lambda x: -x.get("area", 0)):
    if any(math.hypot(d["x"] - m["x"], d["y"] - m["y"]) < 2.2 for m in merged):
        continue
    merged.append(d)

dots = merged
print(f"dots after dedupe: {len(dots)}")

lines = []
for i in range(len(dots)):
    for j in range(i + 1, len(dots)):
        d = math.hypot(dots[i]["x"] - dots[j]["x"], dots[i]["y"] - dots[j]["y"])
        if d > 14:
            continue
        if line_has_yellow(dots[i]["x"], dots[i]["y"], dots[j]["x"], dots[j]["y"]):
            lines.append((i, j))

print(f"lines: {len(lines)}")

lines_xml = []
for i, j in lines:
    lines_xml.append(
        f'    <line x1="{dots[i]["x"]}" y1="{dots[i]["y"]}" x2="{dots[j]["x"]}" y2="{dots[j]["y"]}" />'
    )

circles_xml = []
for d in dots:
    circles_xml.append(f'    <circle cx="{d["x"]}" cy="{d["y"]}" r="{d["r"]}" />')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 104" fill="none" role="img" aria-label="Gemini heart replica">
  <defs>
    <linearGradient id="aiyra-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ED64A6" />
      <stop offset="100%" stop-color="#6B46C1" />
    </linearGradient>
  </defs>
  <rect x="12" y="12" width="96" height="88" rx="10" fill="url(#aiyra-bg)" />
  <g transform="translate(12, 12)" fill="none" stroke="#FFDE17" stroke-width="0.65" stroke-linecap="round" opacity="0.72">
{chr(10).join(lines_xml)}
  </g>
  <g transform="translate(12, 12)" fill="#FFDE17">
{chr(10).join(circles_xml)}
  </g>
</svg>
'''

with open(OUT, "w", encoding="utf-8") as f:
    f.write(svg)
print(f"written {OUT}")
