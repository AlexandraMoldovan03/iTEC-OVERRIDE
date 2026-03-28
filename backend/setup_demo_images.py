"""
backend/setup_demo_images.py

Creează imagini de referință DEMO pentru posterele mock.
Rulează o singură dată ca să populezi folderul images/ cu date de test.

Usage (din folderul backend/, cu venv activat):
    python setup_demo_images.py

Ce face:
  - Creează folderul images/ dacă nu există
  - Generează o imagine sintetică unică per poster (pattern geometric distinct)
  - Scrie fișierul .json cu metadatele posterului
  - Înregistrează fiecare poster la backend-ul local via POST /posters

Imagini reale:
  Înlocuiești imaginile din images/ cu fotografii reale ale posterelor.
  Denumire: <poster_id>.jpg + <poster_id>.json
"""

import os
import json
import numpy as np
import cv2
from pathlib import Path

# ─── Posterele mock (trebuie să corespundă cu src/mock/posters.ts) ────────────

MOCK_POSTERS = [
    {
        "posterId":   "poster_001",
        "posterName": "Warehouse District — East Wall",
        "color":      (80, 40, 180),   # BGRd
        "shape":      "circles",
    },
    {
        "posterId":   "poster_002",
        "posterName": "Metro Hub — Platform B",
        "color":      (30, 160, 50),
        "shape":      "lines",
    },
    {
        "posterId":   "poster_003",
        "posterName": "Market Square — North Gate",
        "color":      (180, 80, 40),
        "shape":      "diamonds",
    },
]

IMAGES_DIR = Path("images")
IMG_W, IMG_H = 800, 1130   # aprox. raport A2 în pixeli


def make_synthetic_poster(color: tuple, shape: str, seed: int) -> np.ndarray:
    """
    Creează o imagine sintetică cu un pattern geometric unic.
    Folosit ca placeholder până când sunt disponibile poze reale.
    """
    rng = np.random.default_rng(seed)

    # Fundal gradient
    img = np.zeros((IMG_H, IMG_W, 3), dtype=np.uint8)
    for y in range(IMG_H):
        t = y / IMG_H
        b = int(color[0] * (1 - t) + 20 * t)
        g = int(color[1] * (1 - t) + 10 * t)
        r = int(color[2] * (1 - t) + 5  * t)
        img[y, :] = [b, g, r]

    # Zgomot textural (face ORB să extragă mai multe keypoints)
    noise = rng.integers(0, 40, (IMG_H, IMG_W, 3), dtype=np.uint8)
    img = cv2.add(img, noise)

    # Pattern geometric
    for i in range(30):
        x = int(rng.integers(50, IMG_W - 50))
        y = int(rng.integers(50, IMG_H - 50))
        sz = int(rng.integers(20, 80))
        c  = (int(rng.integers(80, 255)), int(rng.integers(80, 255)), int(rng.integers(80, 255)))
        thick = int(rng.integers(1, 4))

        if shape == "circles":
            cv2.circle(img, (x, y), sz, c, thick)
        elif shape == "lines":
            x2 = x + int(rng.integers(-sz, sz))
            y2 = y + int(rng.integers(-sz, sz))
            cv2.line(img, (x, y), (x2, y2), c, thick)
        elif shape == "diamonds":
            pts = np.array([
                [x,      y - sz],
                [x + sz, y     ],
                [x,      y + sz],
                [x - sz, y     ],
            ], np.int32)
            cv2.polylines(img, [pts], True, c, thick)

    # Text cu ID-ul posterului (ajută la debug vizual)
    cv2.putText(img, f"POSTER DEMO", (30, 60),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)

    return img


def main():
    IMAGES_DIR.mkdir(exist_ok=True)
    print(f"📁 Images dir: {IMAGES_DIR.absolute()}")

    for idx, poster in enumerate(MOCK_POSTERS):
        poster_id   = poster["posterId"]
        poster_name = poster["posterName"]
        color       = poster["color"]
        shape       = poster["shape"]

        # ── Generează imagine sintetică ───────────────────────────────────────
        img = make_synthetic_poster(color, shape, seed=idx * 42)

        # ── Salvează imagine ──────────────────────────────────────────────────
        img_path = IMAGES_DIR / f"{poster_id}.jpg"
        cv2.imwrite(str(img_path), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        print(f"✅ Saved {img_path}")

        # ── Salvează metadata ─────────────────────────────────────────────────
        meta_path = IMAGES_DIR / f"{poster_id}.json"
        meta_path.write_text(json.dumps({
            "posterId":   poster_id,
            "posterName": poster_name,
        }, ensure_ascii=False, indent=2))
        print(f"✅ Saved {meta_path}")

    print()
    print("=" * 55)
    print("Demo images created! Now restart the backend:")
    print("  python -m uvicorn main:app --host 0.0.0.0 --port 8000")
    print()
    print("To use REAL poster images instead:")
    print("  1. Replace images/<poster_id>.jpg with actual poster photos")
    print("  2. Restart the backend (it re-indexes on startup)")
    print("  3. Or call POST /posters to add them without restart")
    print("=" * 55)


if __name__ == "__main__":
    main()
