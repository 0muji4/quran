import io
import json
import logging
import os
import tempfile
import time
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

import psycopg
import redis
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from minio import Minio
from minio.error import S3Error
from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

load_dotenv()


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("worker")


def init_telemetry() -> None:
    service_name = os.getenv("OTEL_SERVICE_NAME", "quran-worker")
    service_version = os.getenv("SERVICE_VERSION", "0.0.0")
    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    trace_endpoint = f"{endpoint.rstrip('/')}/v1/traces" if endpoint else None
    metric_endpoint = f"{endpoint.rstrip('/')}/v1/metrics" if endpoint else None

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": service_version,
            "service.namespace": "quran-project",
        }
    )

    tracer_provider = TracerProvider(resource=resource)
    tracer_provider.add_span_processor(
        BatchSpanProcessor(
            OTLPSpanExporter(endpoint=trace_endpoint) if trace_endpoint else OTLPSpanExporter()
        )
    )
    trace.set_tracer_provider(tracer_provider)

    metric_reader = PeriodicExportingMetricReader(
        OTLPMetricExporter(endpoint=metric_endpoint) if metric_endpoint else OTLPMetricExporter(),
        export_interval_millis=10_000,
    )
    metrics.set_meter_provider(MeterProvider(resource=resource, metric_readers=[metric_reader]))


init_telemetry()
tracer = trace.get_tracer("quran-worker")
meter = metrics.get_meter("quran-worker")
queue_wait_histogram = meter.create_histogram(
    "worker.queue.wait.duration",
    unit="ms",
    description="Time spent waiting in the queue before processing",
)
processing_duration_histogram = meter.create_histogram(
    "worker.queue.processing.duration",
    unit="ms",
    description="Time spent processing queue jobs",
)


def parse_enqueued_at(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    if value.endswith("Z"):
        value = value.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


@dataclass
class WorkerConfig:
    redis_url: str
    queue_name: str
    postgres_dsn: str
    minio_endpoint: str
    minio_access_key: str
    minio_secret_key: str
    minio_bucket: str
    minio_secure: bool = False
    whisper_model_size: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "float16"
    alignment_prefix: str = "alignments/"
    queue_auth_token: Optional[str] = None

    @classmethod
    def from_env(cls) -> "WorkerConfig":
        minio_secure = os.getenv("MINIO_SECURE", "false").lower() in {"1", "true", "yes"}
        return cls(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            queue_name=os.getenv("QUEUE_NAME", "quran:asr_jobs"),
            postgres_dsn=os.environ.get("POSTGRES_DSN", ""),
            minio_endpoint=os.getenv("MINIO_ENDPOINT", "localhost:9000"),
            minio_access_key=os.getenv("MINIO_ACCESS_KEY", ""),
            minio_secret_key=os.getenv("MINIO_SECRET_KEY", ""),
            minio_bucket=os.getenv("MINIO_BUCKET", "quran-alignments"),
            minio_secure=minio_secure,
            whisper_model_size=os.getenv("WHISPER_MODEL_SIZE", "small"),
            whisper_device=os.getenv("WHISPER_DEVICE", "cpu"),
            whisper_compute_type=os.getenv("WHISPER_COMPUTE_TYPE", "int8"),
            alignment_prefix=os.getenv("ALIGNMENT_PREFIX", "alignments/"),
            queue_auth_token=os.getenv("QUEUE_AUTH_TOKEN"),
        )


def compute_wer(reference: str, hypothesis: str) -> float:
    ref_tokens = reference.strip().split()
    hyp_tokens = hypothesis.strip().split()

    if not ref_tokens:
        return 0.0 if not hyp_tokens else 1.0

    dp = [[0] * (len(hyp_tokens) + 1) for _ in range(len(ref_tokens) + 1)]
    for i in range(len(ref_tokens) + 1):
        dp[i][0] = i
    for j in range(len(hyp_tokens) + 1):
        dp[0][j] = j

    for i, ref_word in enumerate(ref_tokens, 1):
        for j, hyp_word in enumerate(hyp_tokens, 1):
            cost = 0 if ref_word == hyp_word else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,  # deletion
                dp[i][j - 1] + 1,  # insertion
                dp[i - 1][j - 1] + cost,  # substitution
            )

    return dp[-1][-1] / len(ref_tokens)


class ResultWriter:
    def __init__(self, cfg: WorkerConfig):
        if not cfg.postgres_dsn:
            raise ValueError("POSTGRES_DSN is required")
        if not cfg.minio_endpoint or not cfg.minio_access_key or not cfg.minio_secret_key:
            raise ValueError("MINIO_* settings are required")

        self.cfg = cfg
        self.pg = psycopg.connect(cfg.postgres_dsn, autocommit=True)
        self.minio = Minio(
            endpoint=cfg.minio_endpoint,
            access_key=cfg.minio_access_key,
            secret_key=cfg.minio_secret_key,
            secure=cfg.minio_secure,
        )

        if not self.minio.bucket_exists(cfg.minio_bucket):
            logger.info("Creating MinIO bucket %s", cfg.minio_bucket)
            self.minio.make_bucket(cfg.minio_bucket)

    def save_alignment(
        self, session_id: str, payload: Dict[str, Any], content_type: str = "application/json"
    ) -> str:
        object_key = f"{self.cfg.alignment_prefix}{session_id}.json"
        data = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
        self.minio.put_object(
            self.cfg.minio_bucket,
            object_key,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type,
        )
        return object_key

    def upsert_result(
        self,
        session_id: str,
        ayah_id: int,
        audio_key: str,
        expected_text_ar: str,
        transcript: str,
        word_timestamps: List[Dict[str, Any]],
        wer: Optional[float],
        alignment_object_key: str,
    ) -> None:
        with self.pg.cursor() as cur:
            cur.execute(
                """
                INSERT INTO asr_results (
                    session_id, ayah_id, audio_key, expected_text_ar,
                    transcript, word_timestamps, wer, alignment_object_key,
                    created_at, updated_at
                ) VALUES (%(session_id)s, %(ayah_id)s, %(audio_key)s, %(expected_text_ar)s,
                          %(transcript)s, %(word_timestamps)s, %(wer)s, %(alignment_object_key)s,
                          NOW(), NOW())
                ON CONFLICT (session_id) DO UPDATE
                SET audio_key = EXCLUDED.audio_key,
                    expected_text_ar = EXCLUDED.expected_text_ar,
                    transcript = EXCLUDED.transcript,
                    word_timestamps = EXCLUDED.word_timestamps,
                    wer = EXCLUDED.wer,
                    alignment_object_key = EXCLUDED.alignment_object_key,
                    updated_at = NOW();
                """,
                {
                    "session_id": session_id,
                    "ayah_id": ayah_id,
                    "audio_key": audio_key,
                    "expected_text_ar": expected_text_ar,
                    "transcript": transcript,
                    "word_timestamps": json.dumps(word_timestamps, ensure_ascii=False),
                    "wer": wer,
                    "alignment_object_key": alignment_object_key,
                },
            )

    def update_alignment_reference(self, session_id: str, alignment_object_key: str) -> None:
        with self.pg.cursor() as cur:
            cur.execute(
                """
                UPDATE user_data_objects
                SET alignment_object_key = %(alignment_object_key)s,
                    updated_at = NOW()
                WHERE session_id = %(session_id)s;
                """,
                {"session_id": session_id, "alignment_object_key": alignment_object_key},
            )


class AsrWorker:
    def __init__(self, cfg: WorkerConfig):
        self.cfg = cfg
        self.redis = redis.from_url(cfg.redis_url)
        self.writer = ResultWriter(cfg)
        self.model = WhisperModel(
            cfg.whisper_model_size,
            device=cfg.whisper_device,
            compute_type=cfg.whisper_compute_type,
        )

    def _download_audio(self, audio_key: str) -> str:
        _, temp_path = tempfile.mkstemp(prefix="quran-audio-", suffix=".opus")
        try:
            self.writer.minio.fget_object(self.cfg.minio_bucket, audio_key, temp_path)
        except S3Error as err:
            logger.error("failed to download %s: %s", audio_key, err)
            raise
        return temp_path

    def _transcribe(self, audio_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        segments, _ = self.model.transcribe(
            audio_path, language="ar", beam_size=5, word_timestamps=True
        )

        words: List[Dict[str, Any]] = []
        texts: List[str] = []
        for segment in segments:
            texts.append(segment.text.strip())
            for word in segment.words or []:
                words.append(
                    {
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability,
                    }
                )
        transcript = " ".join(texts).strip()
        return transcript, words

    def process_job(self, job: Dict[str, Any]) -> None:
        required_keys = {"session_id", "audio_key", "ayah_id", "expected_text_ar"}
        if missing := required_keys - job.keys():
            raise ValueError(f"job missing keys: {', '.join(sorted(missing))}")

        if self.cfg.queue_auth_token:
            job_token = str(job.get("auth_token") or "")
            if job_token != self.cfg.queue_auth_token:
                raise ValueError("job auth token mismatch")

        session_id = str(job["session_id"])
        audio_key = str(job["audio_key"])
        ayah_id = int(job["ayah_id"])
        expected_text_ar = str(job.get("expected_text_ar") or "")

        enqueued_at = parse_enqueued_at(job.get("enqueued_at"))
        if enqueued_at:
            queue_wait_ms = (datetime.now(timezone.utc) - enqueued_at).total_seconds() * 1000
            queue_wait_histogram.record(queue_wait_ms, {"session_id": session_id})
            logger.info("queue wait recorded session_id=%s wait_ms=%.2f", session_id, queue_wait_ms)

        processing_start = time.perf_counter()
        with tracer.start_as_current_span(
            "worker.process_job",
            attributes={
                "session_id": session_id,
                "audio_key": audio_key,
                "ayah_id": ayah_id,
            },
        ):
            audio_path = self._download_audio(audio_key)
            try:
                transcript, words = self._transcribe(audio_path)
            finally:
                try:
                    os.remove(audio_path)
                except OSError:
                    pass

            wer = compute_wer(expected_text_ar, transcript) if expected_text_ar else None

            alignment_payload = {
                "session_id": session_id,
                "ayah_id": ayah_id,
                "audio_key": audio_key,
                "expected_text_ar": expected_text_ar,
                "transcript": transcript,
                "word_timestamps": words,
            }
            alignment_key = self.writer.save_alignment(session_id, alignment_payload)

            self.writer.upsert_result(
                session_id=session_id,
                ayah_id=ayah_id,
                audio_key=audio_key,
                expected_text_ar=expected_text_ar,
                transcript=transcript,
                word_timestamps=words,
                wer=wer,
                alignment_object_key=alignment_key,
            )
            self.writer.update_alignment_reference(session_id, alignment_key)
            logger.info(
                "processed session_id=%s ayah_id=%s words=%d wer=%s alignment=%s",
                session_id,
                ayah_id,
                len(words),
                f"{wer:.4f}" if wer is not None else "n/a",
                alignment_key,
            )

        processing_ms = (time.perf_counter() - processing_start) * 1000
        processing_duration_histogram.record(processing_ms, {"session_id": session_id})

    def run_forever(self) -> None:
        logger.info("listening on queue %s via %s", self.cfg.queue_name, self.cfg.redis_url)
        while True:
            message = self.redis.brpop(self.cfg.queue_name, timeout=5)
            if not message:
                continue

            _, payload = message
            try:
                job = json.loads(payload)
            except json.JSONDecodeError as err:
                logger.error("invalid payload: %s", err)
                continue

            try:
                self.process_job(job)
            except Exception as err:  # noqa: BLE001
                session_id = job.get("session_id", "unknown") if isinstance(job, dict) else "unknown"
                logger.exception("failed to process job session_id=%s: %s", session_id, err)


def main() -> None:
    cfg = WorkerConfig.from_env()
    worker = AsrWorker(cfg)
    worker.run_forever()


if __name__ == "__main__":
    main()
