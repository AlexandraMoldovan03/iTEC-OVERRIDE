"""
backend/matcher.py
Visual poster matching using OpenCV ORB + BFMatcher + Homography.

Key design decisions vs naive ORB:
  1. Reference images are resized to MAX_REF_DIM before feature extraction.
     This keeps keypoint scales comparable with what the phone camera captures.
     (A 2480×3508 reference vs a poster at ~500px on screen = 5x scale gap → ORB fails)
  2. CLAHE preprocessing on both reference and query images to normalise
     lighting differences (phone flash, ambient light vs studio scan).
  3. BFMatcher (Hamming, cross-check) instead of FLANN.
     More reliable for small databases; no LSH approximation errors.
  4. No pHash pre-filter. With ≤ 50 posters it's not needed, and phone photos
     always differ enough from clean references to cause false eliminations.
  5. INLIER_DENOMINATOR = 15. Real-world photo matching yields 8-20 inliers,
     not 40+. Set so 15 clean inliers → confidence ≈ 1.0.

Confidence thresholds used by the mobile app:
  ≥ 0.75 → auto-open poster
  ≥ 0.35 → show candidate list
  < 0.35 → not recognised
"""

import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

log = logging.getLogger("muralwar.matcher")

# ─── Tunable constants ────────────────────────────────────────────────────────

ORB_FEATURES       = 3000   # keypoints per image; more = better recall
MAX_REF_DIM        = 900    # resize reference to this max dimension before indexing
CLAHE_CLIP         = 2.0    # CLAHE clip limit (contrast normalisation)
CLAHE_GRID         = 8      # CLAHE tile grid size
MAX_HAMMING_DIST   = 55     # BFMatcher: keep matches with Hamming dist ≤ this (0-256)
MIN_GOOD_MATCHES   = 8      # minimum good matches to attempt homography
INLIER_DENOMINATOR = 15.0   # inliers needed for confidence = 1.0
RANSAC_REPROJ      = 5.0    # RANSAC reprojection threshold (pixels)


# ─── Data classes ─────────────────────────────────────────────────────────────

@dataclass
class PosterEntry:
    poster_id:   str
    poster_name: str
    keypoints:   list          # list of cv2.KeyPoint (at MAX_REF_DIM scale)
    descriptors: np.ndarray    # shape (N, 32), dtype uint8
    ref_w:       int           # image width at indexing scale
    ref_h:       int           # image height at indexing scale


@dataclass
class MatchResult:
    poster_id:   str
    poster_name: str
    confidence:  float          # 0..1
    inliers:     int
    corners:     Optional[list] = None  # [[x,y]*4] normalised 0..1 in query image


# ─── CLAHE helper ─────────────────────────────────────────────────────────────

_clahe = cv2.createCLAHE(clipLimit=CLAHE_CLIP, tileGridSize=(CLAHE_GRID, CLAHE_GRID))


def _preprocess(img: np.ndarray) -> np.ndarray:
    """Convert to grayscale and apply CLAHE for lighting normalisation."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    return _clahe.apply(gray)


def _resize_max(img: np.ndarray, max_dim: int) -> np.ndarray:
    """Resize so the longest side ≤ max_dim (preserves aspect ratio)."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    return cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)


# ─── PosterMatcher ────────────────────────────────────────────────────────────

class PosterMatcher:
    """
    In-memory poster index.
    Uses ORB descriptors + BFMatcher (Hamming, cross-check) + RANSAC homography.
    """

    def __init__(self, images_dir: Path):
        self.images_dir = images_dir
        self._index: list[PosterEntry] = []

        self._orb = cv2.ORB_create(
            nfeatures=ORB_FEATURES,
            scaleFactor=1.2,
            nlevels=8,
            edgeThreshold=15,
            patchSize=31,
        )
        # BFMatcher with Hamming distance + cross-check for clean, reliable matches
        self._bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

    @property
    def poster_count(self) -> int:
        return len(self._index)

    # ── Index building ────────────────────────────────────────────────────────

    def build_index(self) -> None:
        self._index.clear()

        if not self.images_dir.exists():
            log.warning(f"Images dir {self.images_dir} does not exist — empty index")
            return

        paths = sorted(self.images_dir.glob("*.jpg")) + sorted(self.images_dir.glob("*.png"))
        for img_path in paths:
            poster_id = img_path.stem
            meta_path = img_path.with_suffix(".json")

            poster_name = poster_id
            if meta_path.exists():
                try:
                    meta = json.loads(meta_path.read_text())
                    poster_name = meta.get("posterName", poster_id)
                except Exception:
                    pass

            img = cv2.imread(str(img_path))
            if img is None:
                log.warning(f"Cannot read {img_path}, skipping")
                continue

            entry = self._extract(img, poster_id, poster_name)
            if entry is not None:
                self._index.append(entry)
                log.debug(
                    f"Indexed '{poster_name}' — {len(entry.keypoints)} kps "
                    f"@ {entry.ref_w}×{entry.ref_h}px"
                )

        log.info(f"Built index: {len(self._index)} posters")

    def add_poster(self, poster_id: str, poster_name: str, image: np.ndarray) -> None:
        """Add (or replace) a single poster in the live index."""
        self._index = [e for e in self._index if e.poster_id != poster_id]
        entry = self._extract(image, poster_id, poster_name)
        if entry:
            self._index.append(entry)

    # ── Feature extraction ────────────────────────────────────────────────────

    def _extract(self, img: np.ndarray, poster_id: str, poster_name: str) -> Optional[PosterEntry]:
        # Resize to MAX_REF_DIM so scale matches typical phone captures
        img_small = _resize_max(img, MAX_REF_DIM)
        h, w = img_small.shape[:2]

        gray = _preprocess(img_small)
        kps, descs = self._orb.detectAndCompute(gray, None)

        if descs is None or len(kps) < MIN_GOOD_MATCHES:
            log.warning(
                f"Too few keypoints for '{poster_id}' "
                f"({len(kps) if kps else 0} kps), skipping"
            )
            return None

        return PosterEntry(
            poster_id=poster_id,
            poster_name=poster_name,
            keypoints=kps,
            descriptors=descs,
            ref_w=w,
            ref_h=h,
        )

    # ── Matching ──────────────────────────────────────────────────────────────

    def match(self, query_img: np.ndarray, top_k: int = 3) -> list[MatchResult]:
        """
        Match query image against all indexed posters.
        Returns up to top_k MatchResult objects sorted by descending confidence.
        """
        if not self._index:
            log.warning("Index is empty — no posters to match against")
            return []

        # Resize query to MAX_REF_DIM so scales are comparable with references
        query_small = _resize_max(query_img, MAX_REF_DIM)
        q_h, q_w = query_small.shape[:2]

        q_gray = _preprocess(query_small)
        q_kps, q_descs = self._orb.detectAndCompute(q_gray, None)

        if q_descs is None or len(q_kps) < 4:
            log.info(f"Too few keypoints in query ({len(q_kps) if q_kps else 0})")
            return []

        log.debug(f"Query: {len(q_kps)} keypoints @ {q_w}×{q_h}px")

        results: list[MatchResult] = []

        for entry in self._index:
            result = self._match_one(q_kps, q_descs, q_w, q_h, entry)
            if result is not None:
                results.append(result)

        results.sort(key=lambda r: r.confidence, reverse=True)

        if results:
            log.debug(
                f"Top match: {results[0].poster_name} "
                f"conf={results[0].confidence:.3f} inliers={results[0].inliers}"
            )

        return results[:top_k]

    def _match_one(
        self,
        q_kps: list,
        q_descs: np.ndarray,
        q_w: int,
        q_h: int,
        entry: PosterEntry,
    ) -> Optional[MatchResult]:
        """Match query descriptors against one PosterEntry. Returns MatchResult or None."""

        # ── BFMatcher (Hamming, cross-check) ─────────────────────────────────
        try:
            raw = self._bf.match(q_descs, entry.descriptors)
        except cv2.error as e:
            log.warning(f"BFMatcher error for {entry.poster_id}: {e}")
            return None

        # Filter by Hamming distance threshold
        good = [m for m in raw if m.distance <= MAX_HAMMING_DIST]
        good.sort(key=lambda m: m.distance)

        log.debug(
            f"{entry.poster_name}: {len(raw)} raw → {len(good)} good matches"
        )

        if len(good) < MIN_GOOD_MATCHES:
            # Too few matches — return very low confidence so it still appears in candidates
            return MatchResult(
                poster_id=entry.poster_id,
                poster_name=entry.poster_name,
                confidence=round(len(good) / (INLIER_DENOMINATOR * 4), 4),
                inliers=0,
            )

        # ── Homography + RANSAC ───────────────────────────────────────────────
        src_pts = np.float32([q_kps[m.queryIdx].pt    for m in good]).reshape(-1, 1, 2)
        dst_pts = np.float32([entry.keypoints[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)

        H, mask = cv2.findHomography(dst_pts, src_pts, cv2.RANSAC, RANSAC_REPROJ)

        if H is None or mask is None:
            confidence = round(len(good) / (INLIER_DENOMINATOR * 2), 4)
            return MatchResult(
                poster_id=entry.poster_id,
                poster_name=entry.poster_name,
                confidence=min(confidence, 0.34),
                inliers=0,
            )

        inliers    = int(mask.ravel().sum())
        confidence = round(min(inliers / INLIER_DENOMINATOR, 1.0), 4)

        # ── Project reference corners into query space ────────────────────────
        corners: Optional[list] = None
        try:
            ref_corners = np.float32([
                [0,            0           ],
                [entry.ref_w,  0           ],
                [entry.ref_w,  entry.ref_h ],
                [0,            entry.ref_h ],
            ]).reshape(-1, 1, 2)

            proj    = cv2.perspectiveTransform(ref_corners, H)
            pts     = proj.reshape(4, 2)
            corners = [[float(x / q_w), float(y / q_h)] for x, y in pts]
        except Exception:
            pass

        return MatchResult(
            poster_id=entry.poster_id,
            poster_name=entry.poster_name,
            confidence=confidence,
            inliers=inliers,
            corners=corners,
        )
