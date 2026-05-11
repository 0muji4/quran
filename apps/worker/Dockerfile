FROM python:3.11-slim

WORKDIR /app

# Build deps for psycopg2 (libpq) and any wheel that needs compilation.
# Kept in the same layer as cleanup so they don't bloat the final image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# faster-whisper / ctranslate2 ship glibc-linked wheels, so the slim base
# stays. We add a dedicated non-root user instead of going distroless.
RUN groupadd -r app -g 10001 \
    && useradd -r -u 10001 -g app -d /app -s /sbin/nologin appuser

COPY apps/worker/python/requirements.txt /app/apps/worker/python/requirements.txt

RUN pip install --no-cache-dir -r /app/apps/worker/python/requirements.txt

COPY apps/worker /app/apps/worker

RUN chown -R appuser:app /app

USER appuser

# Worker exposes a small HTTP server on $PORT (default 8080) for the
# Cloud Run liveness probe and `/healthz`. See ADR 0010 and ADR 0013.
ENV PORT=8080
EXPOSE 8080

# urllib.request is stdlib so no extra deps are baked into the image.
# start-period is a bit longer because faster-whisper loads its model at
# boot (~5–10 s).
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz',timeout=2).status==200 else 1)"]

CMD ["python", "-u", "/app/apps/worker/python/main.py"]
