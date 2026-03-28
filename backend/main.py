"""
backend/main.py
FastAPI entry point for MuralWar visual poster matching.

Endpoints:
  POST /scan/match   — upload image, returns top-3 matches
  GET  /health       — liveness check
  POST /posters      — register a new poster reference image (admin)

Run locally:
  uvicorn main:app --reload --host 0.0.0.0 --port 8000

Environment variables (see .env.example):
  SUPABASE_URL          — Supabase project URL
  SUPABASE_SERVICE_KEY  — Supabase service role key (for server-side DB writes)
  POSTER_IMAGES_DIR     — path to folder with reference images (default: ./images)
  MIN_CONFIDENCE        — minimum confidence to return a match (default: 0.20)
"""

import os
import time
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import cv2

from matcher import PosterMatcher, MatchResult

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
log = logging.getLogger("muralwar.scan")

# ─── Config ───────────────────────────────────────────────────────────────────

POSTER_IMAGES_DIR = Path(os.getenv("POSTER_IMAGES_DIR", "./images"))
MIN_CONFIDENCE    = float(os.getenv("MIN_CONFIDENCE", "0.20"))
GEMINI_API_KEY    = os.getenv("GEMINI_API_KEY", "")

# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="MuralWar Scan API",
    description="Visual poster matching microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Matcher singleton (loaded at startup) ────────────────────────────────────
# Priority: Gemini (if GEMINI_API_KEY set) → ORB (OpenCV fallback)

matcher = None   # GeminiMatcher | PosterMatcher


@app.on_event("startup")
async def startup_event():
    global matcher
    log.info(f"Loading poster index from {POSTER_IMAGES_DIR} …")

    if GEMINI_API_KEY:
        try:
            from gemini_matcher import GeminiMatcher
            matcher = GeminiMatcher(images_dir=POSTER_IMAGES_DIR)
            matcher.build_index()
            log.info(f"✅ Using Gemini Vision matcher — {matcher.poster_count} posters loaded")
        except Exception as e:
            log.warning(f"Gemini init failed ({e}), falling back to ORB")
            matcher = None

    if matcher is None:
        matcher = PosterMatcher(images_dir=POSTER_IMAGES_DIR)
        matcher.build_index()
        log.info(f"Using ORB matcher — {matcher.poster_count} posters loaded")

    log.info(f"Index ready — {matcher.poster_count} posters loaded.")


# ─── Schemas ──────────────────────────────────────────────────────────────────

class ScanCandidate(BaseModel):
    posterId:   str
    posterName: str
    confidence: float


class ScanMatchResponse(BaseModel):
    matched:      bool
    posterId:     Optional[str]   = None
    posterName:   Optional[str]   = None
    confidence:   float
    corners:      Optional[list]  = None   # [[x,y], [x,y], [x,y], [x,y]] normalised 0..1
    candidates:   list[ScanCandidate] = []
    processingMs: Optional[int]   = None
    error:        Optional[str]   = None


class PosterRegisterRequest(BaseModel):
    posterId:   str
    posterName: str
    imageUrl:   str   # public URL — backend downloads + indexes


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "posters": matcher.poster_count if matcher else 0,
    }

@app.post("/scan/match", response_model=ScanMatchResponse)
async def scan_match(
    image: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
):
    """
    Accepts a JPEG/PNG image, returns the best-matching poster(s).

    The mobile app sends:
        Content-Type: multipart/form-data
        image:   <JPEG blob>
        user_id: <optional UUID>
    """
    if matcher is None:
        raise HTTPException(status_code=503, detail="Matcher not initialised")

    t_start = time.perf_counter()

    # ── Read uploaded image ─────────────────────────────────────────────────
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image")

    buf = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    log.info(f"Received scan from user={user_id}, shape={img.shape}")

    # ── Match ───────────────────────────────────────────────────────────────
    results: list[MatchResult] = matcher.match(img, top_k=3)

    elapsed_ms = int((time.perf_counter() - t_start) * 1000)
    top_confidence = results[0].confidence if results else 0.0
    log.info(f"Matching done in {elapsed_ms}ms, top confidence={top_confidence:.3f}")

    # ── No match / low confidence ───────────────────────────────────────────
    if not results:
        return ScanMatchResponse(
            matched=False,
            posterId=None,
            posterName=None,
            confidence=0.0,
            corners=None,
            candidates=[],
            processingMs=elapsed_ms,
        )

    if results[0].confidence < MIN_CONFIDENCE:
        candidates = [
            ScanCandidate(
                posterId=r.poster_id,
                posterName=r.poster_name,
                confidence=round(r.confidence, 4),
            )
            for r in results
        ]

        return ScanMatchResponse(
            matched=False,
            posterId=None,
            posterName=None,
            confidence=round(results[0].confidence, 4),
            corners=None,
            candidates=candidates,
            processingMs=elapsed_ms,
        )

    # ── Build success response ──────────────────────────────────────────────
    top = results[0]
    candidates = [
        ScanCandidate(
            posterId=r.poster_id,
            posterName=r.poster_name,
            confidence=round(r.confidence, 4),
        )
        for r in results
    ]

    return ScanMatchResponse(
        matched=top.confidence >= float(os.getenv("CONFIDENCE_AUTO_OPEN", "0.75")),
        posterId=top.poster_id,
        posterName=top.poster_name,
        confidence=round(top.confidence, 4),
        corners=top.corners,
        candidates=candidates,
        processingMs=elapsed_ms,
    )

@app.post("/posters", status_code=201)
async def register_poster(req: PosterRegisterRequest):
    """
    Register a new poster reference image.
    Downloads the image from imageUrl, extracts ORB features, adds to in-memory index.
    NOTE: index is rebuilt from disk on restart — persist images to POSTER_IMAGES_DIR.
    """
    if matcher is None:
        raise HTTPException(status_code=503, detail="Matcher not initialised")

    import httpx
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(req.imageUrl)
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Could not download image: {r.status_code}")
        img_bytes = r.content

    buf = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode downloaded image")

    # Save to disk so it survives restart
    dest = POSTER_IMAGES_DIR / f"{req.posterId}.jpg"
    dest.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(dest), img)

    # Add to live index
    matcher.add_poster(
        poster_id=req.posterId,
        poster_name=req.posterName,
        image=img,
    )

    log.info(f"Registered poster: {req.posterId} ({req.posterName})")
    return {"ok": True, "posterId": req.posterId, "totalPosters": matcher.poster_count}
