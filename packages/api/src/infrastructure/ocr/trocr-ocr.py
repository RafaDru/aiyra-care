"""
TrOCR handwriting OCR for clinical documents (prescriptions, exam requests, etc.).
Optional local dependency — install: pip install -r requirements-trocr.txt

Usage: python trocr-ocr.py <image_path>
"""
from __future__ import annotations

import os
import sys
import warnings

warnings.filterwarnings("ignore")

def fail(msg: str, code: int = 1) -> None:
    print(msg, flush=True)
    sys.exit(code)


try:
    import numpy as np
    from PIL import Image, ImageOps
except ImportError as e:
    fail(f"TrOCR deps missing (Pillow/numpy): {e}")

try:
    import torch
    from transformers import RobertaTokenizer, ViTImageProcessor, VisionEncoderDecoderModel
except ImportError as e:
    fail(
        "TrOCR deps missing. Install with: "
        "pip install -r packages/api/src/infrastructure/ocr/requirements-trocr.txt "
        f"({e})"
    )


MODEL_ID = os.environ.get("TROCR_MODEL", "microsoft/trocr-base-handwritten")
MAX_SIDE = int(os.environ.get("TROCR_MAX_SIDE", "2000"))
MIN_LINE_HEIGHT = 14
MAX_LINES = int(os.environ.get("TROCR_MAX_LINES", "60"))

_image_processor = None
_tokenizer = None
_model = None
_device = None


def get_model():
    global _image_processor, _tokenizer, _model, _device
    if _model is not None:
        return _image_processor, _tokenizer, _model, _device
    _device = "cuda" if torch.cuda.is_available() else "cpu"
    # TrOCRProcessor breaks on transformers 5.x; load components separately.
    _image_processor = ViTImageProcessor.from_pretrained(MODEL_ID)
    _tokenizer = RobertaTokenizer.from_pretrained(MODEL_ID)
    _model = VisionEncoderDecoderModel.from_pretrained(MODEL_ID)
    _model.to(_device)
    _model.eval()
    return _image_processor, _tokenizer, _model, _device


def prepare_image(path: str) -> Image.Image:
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    m = max(w, h)
    if m > MAX_SIDE:
        scale = MAX_SIDE / m
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return img


def split_lines(img: Image.Image) -> list[Image.Image]:
    """Horizontal projection to crop text lines (handwritten prescriptions)."""
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray)
    arr = np.asarray(gray, dtype=np.uint8)
    # Ink is dark on light paper
    ink = arr < 200
    row_sum = ink.sum(axis=1)
    threshold = max(3, int(arr.shape[1] * 0.01))
    active = row_sum >= threshold

    lines: list[tuple[int, int]] = []
    start = None
    for i, on in enumerate(active):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if i - start >= MIN_LINE_HEIGHT:
                lines.append((start, i))
            start = None
    if start is not None and len(active) - start >= MIN_LINE_HEIGHT:
        lines.append((start, len(active)))

    if not lines:
        return [img]

    # Merge nearby fragments
    merged: list[tuple[int, int]] = [lines[0]]
    for a, b in lines[1:]:
        pa, pb = merged[-1]
        if a - pb < 8:
            merged[-1] = (pa, b)
        else:
            merged.append((a, b))

    crops: list[Image.Image] = []
    pad = 4
    for a, b in merged[:MAX_LINES]:
        top = max(0, a - pad)
        bottom = min(img.height, b + pad)
        crop = img.crop((0, top, img.width, bottom))
        # Skip nearly blank
        g = np.asarray(ImageOps.grayscale(crop))
        if (g < 200).mean() < 0.002:
            continue
        crops.append(crop)
    return crops or [img]


@torch.inference_mode()
def ocr_line(image_processor, tokenizer, model, device, line_img: Image.Image) -> str:
    # TrOCR expects reasonably tall crops
    w, h = line_img.size
    if h < 32:
        scale = 32 / max(h, 1)
        line_img = line_img.resize((max(1, int(w * scale)), 32), Image.Resampling.LANCZOS)
    pixel_values = image_processor(images=line_img, return_tensors="pt").pixel_values.to(device)
    generated = model.generate(pixel_values, max_new_tokens=128)
    return tokenizer.batch_decode(generated, skip_special_tokens=True)[0].strip()


def main() -> None:
    if len(sys.argv) < 2:
        fail("Usage: trocr-ocr.py <image_path>")
    path = sys.argv[1]
    if not os.path.isfile(path):
        fail(f"File not found: {path}")

    img = prepare_image(path)
    image_processor, tokenizer, model, device = get_model()
    lines = split_lines(img)
    texts: list[str] = []
    for line in lines:
        try:
            t = ocr_line(image_processor, tokenizer, model, device, line)
            if t:
                texts.append(t)
        except Exception:
            continue

    out = "\n".join(texts).strip()
    if not out:
        fail("TrOCR returned empty text")
    print(out, flush=True)


if __name__ == "__main__":
    main()
