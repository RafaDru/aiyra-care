"""Split composite AiyraCare logo into horizontal, square, and icon assets."""
from pathlib import Path
from PIL import Image

SRC = Path(r"C:\Users\rafae\Downloads\Gemini_Generated_Image_3m6ja83m6ja83m6j.png")
OUT = Path(__file__).resolve().parent.parent / "packages" / "web" / "public" / "brand"

# Composite 1408×768 — three labeled panels: horizontal (top-left), quadrada (bottom-center), app icon (right).
CROPS = {
    "logo-horizontal.png": (48, 168, 495, 345),
    "logo-square.png": (355, 395, 815, 752),
    "logo-icon.png": (1005, 155, 1375, 685),
}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    for name, box in CROPS.items():
        cropped = src.crop(box)
        cropped.save(OUT / name, optimize=True)
        print(f"{name}: {cropped.size}")

    icon = Image.open(OUT / "logo-icon.png")
    favicon = icon.resize((32, 32), Image.Resampling.LANCZOS)
    favicon.save(OUT / "favicon-32.png", optimize=True)
    apple = icon.resize((180, 180), Image.Resampling.LANCZOS)
    apple.save(OUT / "apple-touch-icon.png", optimize=True)
    print("favicon sizes done")


if __name__ == "__main__":
    main()
