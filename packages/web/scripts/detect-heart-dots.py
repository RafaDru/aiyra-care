"""Detect yellow node blobs (not lines) in Gemini heart image."""
from PIL import Image
import math
import json

IMG = r"C:\Users\rafae\Downloads\Gemini_Generated_Image_j1sn5fj1sn5fj1sn.png"
OUT = r"C:\Users\rafae\Documents\Filhos\packages\web\scripts\gemini-heart-dots.json"

img = Image.open(IMG).convert("RGB")
w, h = img.size
pixels = img.load()

# Bounding box of icon
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b = pixels[x, y]
        if r > 40 or g > 40 or b > 40:
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)

pad = 6
box_x1, box_y1 = min_x + pad, min_y + pad
box_x2, box_y2 = max_x - pad, max_y - pad
box_w = box_x2 - box_x1
box_h = box_y2 - box_y1

# Binary mask: bright yellow nodes (stricter than lines)
mask = [[False] * w for _ in range(h)]
for y in range(box_y1, box_y2):
    for x in range(box_x1, box_x2):
        r, g, b = pixels[x, y]
        if r > 200 and g > 180 and b < 100 and (r + g) > b + 200:
            mask[y][x] = True

# Connected components (4-connected)
seen = [[False] * w for _ in range(h)]
components = []

for sy in range(box_y1, box_y2):
    for sx in range(box_x1, box_x2):
        if not mask[sy][sx] or seen[sy][sx]:
            continue
        stack = [(sx, sy)]
        pts = []
        seen[sy][sx] = True
        while stack:
            x, y = stack.pop()
            pts.append((x, y))
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if box_x1 <= nx < box_x2 and box_y1 <= ny < box_y2:
                    if mask[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        stack.append((nx, ny))
        if len(pts) >= 25:  # skip thin line fragments
            components.append(pts)

# Merge nearby component centroids
raw_centers = []
for pts in components:
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    area = len(pts)
    dists = [math.hypot(p[0] - cx, p[1] - cy) for p in pts]
    r_est = max(dists)
    raw_centers.append((cx, cy, r_est, area))

merged = []
for cx, cy, r_est, area in sorted(raw_centers, key=lambda c: -c[3]):
    if any(math.hypot(cx - m[0], cy - m[1]) < 20 for m in merged):
        continue
    merged.append((cx, cy, r_est, area))

def to_svg(cx, cy, r_img, area):
    sx = (cx - box_x1) / box_w * 96
    sy = (cy - box_y1) / box_h * 88
    # scale radius from blob size
    base = math.sqrt(area / math.pi)
    sr = base / box_w * 96 * 0.55
    if area > 400:
        sr = max(sr, 2.2)
    elif area > 180:
        sr = max(sr, 1.8)
    elif area > 80:
        sr = max(sr, 1.4)
    else:
        sr = max(sr, 1.1)
    sr = max(1.1, min(3.4, sr))
    return round(sx, 1), round(sy, 1), round(sr, 1)

dots = []
for cx, cy, r_est, area in merged:
    sx, sy, sr = to_svg(cx, cy, r_est, area)
    dots.append({"x": sx, "y": sy, "r": sr, "area": area})

dots.sort(key=lambda d: (d["y"], d["x"]))
print(f"components {len(components)} merged {len(dots)} box {box_w}x{box_h}")
for d in dots:
    print(f"  {d['x']}, {d['y']} r={d['r']} area={d['area']}")

with open(OUT, "w") as f:
    json.dump({"dots": dots}, f, indent=2)
