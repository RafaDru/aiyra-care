import sys
import os
from PIL import Image, ImageOps

try:
    import pytesseract
except ImportError:
    print("pytesseract not installed", flush=True)
    sys.exit(1)

tesseract_paths = [
    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
]
for p in tesseract_paths:
    if os.path.isfile(p):
        pytesseract.pytesseract.tesseract_cmd = p
        break
else:
    print("tesseract binary not found", flush=True)
    sys.exit(1)

tessdata_paths = [
    os.path.join(os.path.dirname(os.path.dirname(pytesseract.pytesseract.tesseract_cmd)), "tessdata"),
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Tesseract-OCR", "tessdata"),
    os.environ.get("TESSDATA_PREFIX", ""),
]
for td in tessdata_paths:
    if td and os.path.isfile(os.path.join(td, "por.traineddata")):
        os.environ["TESSDATA_PREFIX"] = td
        break

if len(sys.argv) < 2:
    print("Usage: python-ocr.py <image_path> [lang]", flush=True)
    sys.exit(1)

image_path = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 else 'por'

if not os.path.isfile(image_path):
    print(f"File not found: {image_path}", flush=True)
    sys.exit(1)

try:
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)
    # Local preprocessing — cheap gains before paid OCR fallback
    if img.mode not in ('L', 'RGB'):
        img = img.convert('RGB')
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray)
    w, h = gray.size
    if max(w, h) < 1600:
        scale = 1600 / max(w, h)
        gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)

    text = pytesseract.image_to_string(gray, lang=lang, config='--psm 6')
    print(text, flush=True)
except Exception as e:
    print(f"OCR error: {e}", flush=True)
    sys.exit(1)
