# ASR Worker

This worker consumes jobs pushed to Redis, downloads the corresponding audio from MinIO, runs Faster-Whisper (Arabic) with word-level timestamps, and writes results back to Postgres plus a JSON alignment artifact to MinIO.

## Configuration

Set the following environment variables:

- `REDIS_URL` – Redis connection string (e.g. `redis://localhost:6379/0`).
- `QUEUE_NAME` – Redis list to consume (defaults to `quran:asr_jobs`).
- `POSTGRES_DSN` – Postgres DSN used by `psycopg` for upserts.
- `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`, `MINIO_SECURE` – object storage configuration.
- `WHISPER_MODEL_SIZE` – `"small"` or `"medium"` depending on GPU/CPU availability.
- `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE` – device tuning (`cpu`/`cuda`, `"int8"`, `"float16"`, etc.).

Install dependencies and start the worker:

```bash
cd apps/worker
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Jobs should be JSON objects with the following fields:

- `session_id` – unique identifier for this scoring run (used as the primary key in Postgres).
- `audio_key` – object key in MinIO pointing to the uploaded audio.
- `ayah_id` – verse id for context and relational integrity.
- `expected_text_ar` – Arabic reference text for WER calculation.
