import sys
import os
import json
from PIL import Image, ImageOps

# UTF-8 no stdout (Windows)
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    import pytesseract
except ImportError:
    sys.stdout.buffer.write(json.dumps({"error": "pytesseract not installed"}, ensure_ascii=False).encode('utf-8'))
    sys.stdout.buffer.write(b'\n')
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
    print(json.dumps({"error": "tesseract binary not found"}), flush=True)
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
    print(json.dumps({"error": "Usage: python-ocr.py <image_path> [lang]"}), flush=True)
    sys.exit(1)

image_path = sys.argv[1]
lang = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('--') else 'por'
json_mode = '--json' in sys.argv
vaccine_mode = '--vaccine-card' in sys.argv
min_conf = 15 if vaccine_mode else 25

if not os.path.isfile(image_path):
    print(json.dumps({"error": f"File not found: {image_path}"}), flush=True)
    sys.exit(1)


def preprocess(img: Image.Image) -> Image.Image:
    img = ImageOps.exif_transpose(img)
    if img.mode not in ('L', 'RGB'):
        img = img.convert('RGB')
    gray = ImageOps.grayscale(img)
    gray = ImageOps.autocontrast(gray)
    w, h = gray.size
    if max(w, h) < 1600:
        scale = 1600 / max(w, h)
        gray = gray.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    return gray


def group_line_regions(data: dict, conf_threshold: int = 25) -> list:
    lines_map: dict = {}
    n = len(data['text'])
    for i in range(n):
        try:
            conf = int(float(data['conf'][i]))
        except (ValueError, TypeError):
            conf = -1
        txt = (data['text'][i] or '').strip()
        if conf < conf_threshold or not txt:
            continue
        key = (int(data['block_num'][i]), int(data['par_num'][i]), int(data['line_num'][i]))
        entry = lines_map.setdefault(key, {
            'texts': [],
            'left': 10_000_000,
            'top': 10_000_000,
            'right': 0,
            'bottom': 0,
            'conf': [],
        })
        left = int(data['left'][i])
        top = int(data['top'][i])
        w = int(data['width'][i])
        h = int(data['height'][i])
        entry['texts'].append(txt)
        entry['left'] = min(entry['left'], left)
        entry['top'] = min(entry['top'], top)
        entry['right'] = max(entry['right'], left + w)
        entry['bottom'] = max(entry['bottom'], top + h)
        entry['conf'].append(conf)

    regions = []
    line_idx = 0
    for key in sorted(lines_map.keys()):
        e = lines_map[key]
        if e['right'] <= e['left'] or e['bottom'] <= e['top']:
            continue
        text = ' '.join(e['texts'])
        regions.append({
            'id': f'line-{line_idx}',
            'text': text,
            'left': e['left'],
            'top': e['top'],
            'width': e['right'] - e['left'],
            'height': e['bottom'] - e['top'],
            'confidence': round(sum(e['conf']) / len(e['conf']), 1),
            'lineIndex': line_idx,
        })
        line_idx += 1
    return regions


def emit_json(payload: dict) -> None:
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.write(b'\n')
    sys.stdout.buffer.flush()


try:
    img = Image.open(image_path)
    gray = preprocess(img)
    if vaccine_mode:
        try:
            from PIL import ImageFilter
            gray = gray.filter(ImageFilter.SHARPEN)
        except Exception:
            pass
    ocr_w, ocr_h = gray.size

    psm_candidates = (4, 6, 11, 12) if vaccine_mode else (6, 11, 4)
    best_text = ''
    best_psm = 6
    for psm in psm_candidates:
        try:
            chunk = pytesseract.image_to_string(gray, lang=lang, config=f'--psm {psm}')
            if len(chunk.strip()) > len(best_text.strip()):
                best_text = chunk
                best_psm = psm
        except Exception:
            pass

    if not best_text.strip():
        best_text = pytesseract.image_to_string(gray, lang=lang, config='--psm 6')

    data = pytesseract.image_to_data(
        gray,
        lang=lang,
        config=f'--psm {best_psm}',
        output_type=pytesseract.Output.DICT,
    )
    regions = group_line_regions(data, min_conf)

    if not best_text.strip() and regions:
        best_text = '\n'.join(r['text'] for r in regions)

    if json_mode:
        emit_json({
            'text': best_text.strip(),
            'layout': {
                'imageWidth': ocr_w,
                'imageHeight': ocr_h,
                'regions': regions,
            },
        })
    else:
        sys.stdout.buffer.write(best_text.encode('utf-8'))
        sys.stdout.buffer.flush()
except Exception as e:
    emit_json({'error': f'OCR error: {e}'})
    sys.exit(1)
