import sys
import json
import fitz  # PyMuPDF

def extract_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    pages = []
    full_text_lines = []

    for i, page in enumerate(doc):
        page_num = i + 1
        page_text = page.get_text('text')
        full_text_lines.append(page_text)

        pages.append({
            'pageNumber': page_num,
            'text': page_text,
        })

    return {
        'pageCount': len(doc),
        'text': '\n'.join(full_text_lines),
        'pages': pages,
    }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'PDF file path required'}))
        sys.exit(1)

    pdf_file = sys.argv[1]
    try:
        res = extract_pdf(pdf_file)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)
