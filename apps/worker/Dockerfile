FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY apps/worker/python/requirements.txt /app/apps/worker/python/requirements.txt

RUN pip install --no-cache-dir -r /app/apps/worker/python/requirements.txt

COPY apps/worker /app/apps/worker

CMD ["python", "-u", "/app/apps/worker/python/main.py"]
