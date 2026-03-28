"""
backend/sync_images.py

Descarcă imaginile de referință ale posterelor din Supabase
și le salvează în folderul images/ pentru indexare de către backend.

Necesită în .env (sau variabile de mediu):
    SUPABASE_URL=https://xxxx.supabase.co
    SUPABASE_SERVICE_KEY=eyJhbGc...

Usage (din folderul backend/, cu venv activat):
    python sync_images.py

    # Sau forțat re-download chiar dacă imaginea există deja:
    python sync_images.py --force

Ce face:
  1. Fetch toate posterele din Supabase care au reference_image_url setat
  2. Descarcă fiecare imagine în images/<poster_id>.jpg
  3. Scrie images/<poster_id>.json cu metadatele
  4. Opțional: notifică backend-ul local (POST /posters) să re-indexeze live
"""

import os
import sys
import json
import httpx
import numpy as np
import cv2
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────

# Încearcă să încarce .env dacă există
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL     = (os.getenv("SUPABASE_URL")
                    or os.getenv("EXPO_PUBLIC_SUPABASE_URL", ""))
SUPABASE_KEY     = (os.getenv("SUPABASE_SERVICE_KEY")
                    or os.getenv("SUPABASE_ANON_KEY")
                    or os.getenv("EXPO_PUBLIC_SUPABASE_ANON_KEY", ""))
IMAGES_DIR       = Path(os.getenv("POSTER_IMAGES_DIR", "./images"))
BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:8000")
FORCE_REDOWNLOAD = "--force" in sys.argv

# ─── Helpers ──────────────────────────────────────────────────────────────────

def supabase_get(path: str, params: dict = None) -> dict:
    """Fetch din Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "SUPABASE_URL și SUPABASE_SERVICE_KEY trebuie setate în .env\n"
            "Copiază .env.example în .env și completează valorile."
        )
    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
    }
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    resp = httpx.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json()


def download_image(url: str) -> np.ndarray | None:
    """Descarcă imaginea de la URL și o decodează cu OpenCV."""
    try:
        resp = httpx.get(url, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        buf = np.frombuffer(resp.content, dtype=np.uint8)
        img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"    ❌ Download failed: {e}")
        return None


def notify_backend(poster_id: str, poster_name: str, image_url: str) -> bool:
    """Notifică backend-ul să re-indexeze posterul (opțional)."""
    try:
        resp = httpx.post(
            f"{BACKEND_URL}/posters",
            json={"posterId": poster_id, "posterName": poster_name, "imageUrl": image_url},
            timeout=30,
        )
        return resp.status_code == 201
    except Exception:
        return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    print(f"📁 Images dir: {IMAGES_DIR.absolute()}")
    print()

    # ── Fetch posteri din Supabase ────────────────────────────────────────────
    print("🔍 Fetching posters from Supabase...")
    try:
        posters = supabase_get("posters", params={
            "select":              "id,name,reference_image_url",
            "reference_image_url": "not.is.null",
        })
    except RuntimeError as e:
        print(f"\n⚠️  {e}")
        sys.exit(1)

    if not posters:
        print("⚠️  No posters found in Supabase with reference_image_url set.")
        print("   Setează reference_image_url pe postere în tabela posters.")
        sys.exit(0)

    print(f"✅ Found {len(posters)} poster(s) with reference images\n")

    synced     = 0
    skipped    = 0
    failed     = 0
    live_index = 0

    for p in posters:
        poster_id   = p.get("id", "")
        poster_name = p.get("name", poster_id)
        image_url   = p.get("reference_image_url", "")

        if not poster_id or not image_url:
            continue

        img_path  = IMAGES_DIR / f"{poster_id}.jpg"
        json_path = IMAGES_DIR / f"{poster_id}.json"

        print(f"📌 {poster_name} ({poster_id})")
        print(f"   URL: {image_url[:80]}{'...' if len(image_url) > 80 else ''}")

        # Skip dacă imaginea există deja și nu e forțat re-download
        if img_path.exists() and not FORCE_REDOWNLOAD:
            print(f"   ⏭  Already exists, skipping (use --force to re-download)")
            skipped += 1

            # Actualizează json-ul în caz că s-a schimbat numele
            json_path.write_text(json.dumps({
                "posterId":   poster_id,
                "posterName": poster_name,
            }, ensure_ascii=False, indent=2))
            continue

        # Descarcă imaginea
        print(f"   ⬇️  Downloading...")
        img = download_image(image_url)
        if img is None:
            failed += 1
            continue

        # Salvează pe disc
        cv2.imwrite(str(img_path), img, [cv2.IMWRITE_JPEG_QUALITY, 95])
        json_path.write_text(json.dumps({
            "posterId":   poster_id,
            "posterName": poster_name,
        }, ensure_ascii=False, indent=2))

        print(f"   ✅ Saved ({img.shape[1]}×{img.shape[0]}px)")
        synced += 1

        # Notifică backend-ul live (dacă rulează)
        if notify_backend(poster_id, poster_name, image_url):
            print(f"   🔄 Backend re-indexed live")
            live_index += 1

    # ── Sumar ─────────────────────────────────────────────────────────────────
    print()
    print("=" * 55)
    print(f"Sync complete:")
    print(f"  ✅ Downloaded:  {synced}")
    print(f"  ⏭  Skipped:    {skipped} (already exist)")
    print(f"  ❌ Failed:      {failed}")
    if live_index > 0:
        print(f"  🔄 Live-indexed: {live_index} (backend was running)")
    print()

    if synced > 0 and live_index < synced:
        print("▶️  Restart backend to index new images:")
        print("   python -m uvicorn main:app --host 0.0.0.0 --port 8000")

    print("=" * 55)


if __name__ == "__main__":
    main()
