"""
backend/gemini_matcher.py
Poster matching using Google Gemini Vision API.

Instead of keypoint descriptors, we send the scan photo + all reference
poster images to Gemini and ask it to identify which poster is shown.
This is much more robust than ORB for real-world conditions:
  - perspective / angle distortion
  - partial visibility
  - different lighting, flash, glare
  - camera compression artifacts

Requirements:
  pip install google-generativeai

Environment variable:
  GEMINI_API_KEY=AIza...

Images are resized to max 1024px before sending (to keep API payload small).
"""

import os
import json
import base64
import logging
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np

log = logging.getLogger("muralwar.gemini")

# Max dimension for reference images sent to Gemini (reduces payload size)
MAX_REF_DIM = 1024


# ─── Data class ───────────────────────────────────────────────────────────────

@dataclass
class GeminiMatchResult:
    poster_id:   str
    poster_name: str
    confidence:  float
    reason:      str
    inliers:     int   = 0        # kept for API compat with MatchResult
    corners:     Optional[list] = None


# ─── GeminiMatcher ────────────────────────────────────────────────────────────

class GeminiMatcher:
    """
    In-memory poster index backed by Gemini Vision for matching.
    """

    def __init__(self, images_dir: Path):
        import google.generativeai as genai

        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY not set. "
                "Get a free key at https://aistudio.google.com/app/apikey"
            )

        genai.configure(api_key=api_key)
        self._genai = genai
        self._model = genai.GenerativeModel("gemini-1.5-flash")
        self.images_dir = images_dir
        self._index: list[dict] = []   # [{id, name, image_b64, mime}]

    @property
    def poster_count(self) -> int:
        return len(self._index)

    # ── Index building ────────────────────────────────────────────────────────

    def build_index(self) -> None:
        """
        Load all reference images from images_dir into memory as base64.
        Images are resized to MAX_REF_DIM to keep API payloads manageable.
        """
        self._index.clear()

        if not self.images_dir.exists():
            log.warning(f"Images dir {self.images_dir} does not exist — empty index")
            return

        paths = sorted(self.images_dir.glob("*.jpg")) + sorted(self.images_dir.glob("*.png"))
        for img_path in paths:
            poster_id = img_path.stem

            # Load metadata sidecar
            meta_path = img_path.with_suffix(".json")
            poster_name = poster_id
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    poster_name = meta.get("posterName", poster_id)
                except Exception:
                    pass

            # Read + resize
            img = cv2.imread(str(img_path))
            if img is None:
                log.warning(f"Cannot read {img_path}, skipping")
                continue

            img = _resize_max(img, MAX_REF_DIM)

            # Encode as JPEG bytes → base64
            ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ok:
                log.warning(f"Cannot encode {img_path}, skipping")
                continue

            b64 = base64.standard_b64encode(buf.tobytes()).decode()
            self._index.append({
                "id":       poster_id,
                "name":     poster_name,
                "image_b64": b64,
                "mime":     "image/jpeg",
            })
            log.debug(f"Loaded reference: {poster_name} ({img.shape[1]}×{img.shape[0]}px)")

        log.info(f"Gemini index: {len(self._index)} posters loaded")

    def add_poster(self, poster_id: str, poster_name: str, image: np.ndarray) -> None:
        """Add a single poster to the live index."""
        self._index = [e for e in self._index if e["id"] != poster_id]

        img = _resize_max(image, MAX_REF_DIM)
        ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            return

        b64 = base64.standard_b64encode(buf.tobytes()).decode()
        self._index.append({
            "id":       poster_id,
            "name":     poster_name,
            "image_b64": b64,
            "mime":     "image/jpeg",
        })

    # ── Matching ──────────────────────────────────────────────────────────────

    def match(self, query_img: np.ndarray, top_k: int = 3) -> list[GeminiMatchResult]:
        """
        Send scan + all reference images to Gemini.
        Returns up to top_k GeminiMatchResult sorted by descending confidence.
        """
        if not self._index:
            log.warning("Gemini index is empty")
            return []

        # Encode scan image
        scan_small = _resize_max(query_img, 1024)
        ok, buf = cv2.imencode(".jpg", scan_small, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if not ok:
            log.error("Cannot encode scan image")
            return []
        scan_b64 = base64.standard_b64encode(buf.tobytes()).decode()

        # Build poster ID list for the prompt
        poster_list_str = "\n".join(
            f"  [{i+1}] id={p['id']} name={p['name']}"
            for i, p in enumerate(self._index)
        )

        # ── Build multimodal content ──────────────────────────────────────────
        parts: list = [
            f"""You are a visual poster recognition system for a mobile AR app.

I will show you a SCAN taken with a phone camera of a poster hanging on a wall,
followed by {len(self._index)} REFERENCE images from our database.

The scan may have perspective distortion, partial visibility, different lighting,
reflections, or compression artefacts. Your job is to find which reference poster
best matches the scan, even under these conditions.

Database posters:
{poster_list_str}

SCAN IMAGE (phone photo):""",
            {"mime_type": "image/jpeg", "data": scan_b64},
            "\n\nREFERENCE IMAGES FROM DATABASE:\n",
        ]

        for p in self._index:
            parts.append(f"\n[ID: {p['id']} | {p['name']}]")
            parts.append({"mime_type": p["mime"], "data": p["image_b64"]})

        parts.append(f"""

Compare the scan against all {len(self._index)} reference images above.

Respond with valid JSON only — no markdown, no explanation outside JSON:
{{
  "matches": [
    {{"poster_id": "<exact id>", "poster_name": "<name>", "confidence": <0.0-1.0>, "reason": "<short>"}},
    ...
  ]
}}

Confidence guide:
  0.85-1.00 → very confident (same poster, clear match)
  0.60-0.84 → probable match (some distortion but recognisable)
  0.35-0.59 → uncertain (could be, needs confirmation)
  < 0.35    → no credible match

Return up to {top_k} best matches in descending confidence order.
If nothing matches, return an empty matches array.
poster_id MUST be one of the exact IDs listed above.""")

        # ── Call Gemini ───────────────────────────────────────────────────────
        try:
            response = self._model.generate_content(parts)
            text = response.text.strip()
            log.debug(f"Gemini raw response: {text[:300]}")

            # Strip markdown fences if Gemini wraps in ```json ... ```
            if "```" in text:
                inner = text.split("```", 1)[1]
                if inner.lower().startswith("json"):
                    inner = inner[4:]
                text = inner.split("```")[0].strip()

            data = json.loads(text)
            results = []
            for m in data.get("matches", [])[:top_k]:
                pid = m.get("poster_id")
                if not pid:
                    continue
                results.append(GeminiMatchResult(
                    poster_id=pid,
                    poster_name=m.get("poster_name", pid),
                    confidence=float(m.get("confidence", 0.0)),
                    reason=m.get("reason", ""),
                ))
            log.info(
                f"Gemini matched {len(results)} candidates — "
                f"top confidence={results[0].confidence:.3f} ({results[0].poster_id})"
                if results else "Gemini: no matches"
            )
            return results

        except Exception as e:
            log.error(f"Gemini match error: {e}")
            return []


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _resize_max(img: np.ndarray, max_dim: int) -> np.ndarray:
    """Resize image so that the longest side ≤ max_dim (preserves aspect ratio)."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
