# ── Stage 1: build ─────────────────────────────────────────────────────────
FROM python:3.11-slim AS build

WORKDIR /app

# System deps for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: runtime ────────────────────────────────────────────────────────
FROM python:3.11-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
 && rm -rf /var/lib/apt/lists/*

# Copy installed packages from build stage
COPY --from=build /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=build /usr/local/bin/uvicorn     /usr/local/bin/uvicorn

# Copy source
COPY main.py    .
COPY matcher.py .

# Reference images will be mounted here at runtime
RUN mkdir -p /app/images

ENV POSTER_IMAGES_DIR=/app/images
ENV MIN_CONFIDENCE=0.20
ENV CONFIDENCE_AUTO_OPEN=0.75

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
