import io
import json
import logging
import os
import re
import tempfile
import threading
import time
from datetime import datetime, timezone
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional, Protocol, Tuple

import psycopg
import redis
from dotenv import load_dotenv
from faster_whisper import WhisperModel
from minio import Minio
from minio.error import S3Error
from opentelemetry import context, metrics, trace
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.propagate import extract
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import SpanKind, Status, StatusCode

load_dotenv()


class TraceContextFilter(logging.Filter):
    """Inject trace context into log records for distributed tracing"""

    def filter(self, record):
        span = trace.get_current_span()
        ctx = span.get_span_context()
        if ctx.is_valid:
            record.trace_id = format(ctx.trace_id, "032x")
            record.span_id = format(ctx.span_id, "016x")
        else:
            record.trace_id = ""
            record.span_id = ""
        return True


# Configure logging with trace context
trace_filter = TraceContextFilter()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s | trace_id=%(trace_id)s span_id=%(span_id)s",
)
# Add TraceContextFilter to all handlers to ensure trace context is available
for handler in logging.getLogger().handlers:
    handler.addFilter(trace_filter)
logger = logging.getLogger("worker")

MAX_PROMPT_WORDS = 8


def init_telemetry() -> None:
    if os.getenv("DISABLE_TELEMETRY"):
        logger.info("Telemetry is disabled.")
        return
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

# Queue metrics
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

# Business metrics
job_status_counter = meter.create_counter(
    "worker.jobs.total",
    unit="1",
    description="Total number of jobs processed",
)
audio_upload_counter = meter.create_counter(
    "worker.audio.uploads.total",
    unit="1",
    description="Total number of audio files processed",
)
audio_upload_size_histogram = meter.create_histogram(
    "worker.audio.upload.size",
    unit="bytes",
    description="Size of uploaded audio files",
)
transcription_wer_histogram = meter.create_histogram(
    "worker.transcription.wer",
    unit="1",
    description="Word Error Rate of transcriptions",
)
pronunciation_score_histogram = meter.create_histogram(
    "worker.pronunciation.score",
    unit="1",
    description="Overall pronunciation score",
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


def get_accuracy_bucket(score: float) -> str:
    """Helper function to bucket accuracy scores"""
    if score >= 0.9:
        return "90-100"
    if score >= 0.8:
        return "80-90"
    if score >= 0.7:
        return "70-80"
    if score >= 0.6:
        return "60-70"
    return "below-60"


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
    asr_backend: str = "faster-whisper-local"
    healthz_port: int = 8080

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
            asr_backend=os.getenv("ASR_BACKEND", "faster-whisper-local"),
            healthz_port=int(os.getenv("PORT", "8080")),
        )


@dataclass
class TranscriptionResult:
    transcript: str
    words: List[Dict[str, Any]]


class Transcriber(Protocol):
    """Pluggable ASR backend contract. See ADR 0013."""

    name: str

    def transcribe(self, audio_path: str, expected_text_ar: str) -> TranscriptionResult: ...


class FasterWhisperLocalTranscriber:
    """In-process Whisper inference via faster-whisper. Default backend."""

    name = "faster-whisper-local"

    def __init__(self, cfg: WorkerConfig):
        self.cfg = cfg
        self.model = WhisperModel(
            cfg.whisper_model_size,
            device=cfg.whisper_device,
            compute_type=cfg.whisper_compute_type,
        )

    def transcribe(self, audio_path: str, expected_text_ar: str) -> TranscriptionResult:
        with tracer.start_as_current_span(
            "transcribe_audio",
            attributes={
                "whisper.model": self.cfg.whisper_model_size,
                "whisper.device": self.cfg.whisper_device,
                "asr.backend": self.name,
                "audio.language": "ar",
            },
        ) as span:
            prompt_tokens = expected_text_ar.split() if expected_text_ar else []
            initial_prompt = None
            if prompt_tokens:
                initial_prompt = " ".join(prompt_tokens[:MAX_PROMPT_WORDS]).strip() or None
            segments, _ = self.model.transcribe(
                audio_path,
                language="ar",
                beam_size=5,
                word_timestamps=True,
                initial_prompt=initial_prompt,
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
            span.set_attribute("transcript.word_count", len(words))
            span.set_status(Status(StatusCode.OK))
            return TranscriptionResult(transcript=transcript, words=words)


def build_transcriber(cfg: WorkerConfig) -> Transcriber:
    """Resolve the configured ASR backend.

    Adding a new backend (faster-whisper-gpu, HF Inference Endpoint,
    Inferentia2, external API) means a new class with the Transcriber
    protocol and a new branch here. See ADR 0013.
    """
    backend = cfg.asr_backend
    if backend == "faster-whisper-local":
        return FasterWhisperLocalTranscriber(cfg)
    raise ValueError(f"unknown ASR_BACKEND: {backend!r}")


class HealthzHandler(BaseHTTPRequestHandler):
    """Minimal liveness endpoint. Required by Cloud Run; see ADR 0010."""

    asr_backend: str = "unknown"

    def do_GET(self) -> None:  # noqa: N802 — http.server callback name
        if self.path != "/healthz":
            self.send_response(404)
            self.end_headers()
            return
        body = json.dumps({"status": "ok", "asr_backend": self.asr_backend}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A002 — base-class signature
        # Suppress BaseHTTPRequestHandler's stderr access log; route to our logger
        # at DEBUG so production noise stays low while traces still capture it.
        logger.debug("healthz %s %s", self.command, self.path)


def start_healthz_server(port: int, asr_backend: str) -> HTTPServer:
    HealthzHandler.asr_backend = asr_backend
    server = HTTPServer(("0.0.0.0", port), HealthzHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True, name="healthz-server")
    thread.start()
    logger.info("healthz listening on :%d (asr_backend=%s)", port, asr_backend)
    return server


def normalize_arabic(text: str) -> str:
    """Remove Arabic diacritics (tashkeel) for comparison."""
    # Arabic diacritics Unicode range: U+064B to U+065F, U+0670, U+06D6 to U+06ED
    arabic_diacritics = re.compile(r'[\u064B-\u065F\u0670\u06D6-\u06ED]')
    return arabic_diacritics.sub('', text)


def compute_wer(reference: str, hypothesis: str) -> float:
    # Normalize both strings by removing diacritics
    ref_normalized = normalize_arabic(reference.strip())
    hyp_normalized = normalize_arabic(hypothesis.strip())

    ref_tokens = ref_normalized.split()
    hyp_tokens = hyp_normalized.split()

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


def align_words(reference: str, hypothesis: str) -> List[Dict[str, Optional[str]]]:
    # Normalize both strings by removing diacritics
    ref_normalized = normalize_arabic(reference.strip())
    hyp_normalized = normalize_arabic(hypothesis.strip())

    ref_tokens = ref_normalized.split()
    hyp_tokens = hyp_normalized.split()
    ref_len = len(ref_tokens)
    hyp_len = len(hyp_tokens)

    dp = [[0] * (hyp_len + 1) for _ in range(ref_len + 1)]
    ops: List[List[Optional[str]]] = [[None] * (hyp_len + 1) for _ in range(ref_len + 1)]

    for i in range(1, ref_len + 1):
        dp[i][0] = i
        ops[i][0] = "delete"
    for j in range(1, hyp_len + 1):
        dp[0][j] = j
        ops[0][j] = "insert"

    priority = {"match": 0, "substitute": 1, "delete": 2, "insert": 3}

    for i, ref_word in enumerate(ref_tokens, 1):
        for j, hyp_word in enumerate(hyp_tokens, 1):
            cost = 0 if ref_word == hyp_word else 1
            candidates = [
                (dp[i - 1][j - 1] + cost, "match" if cost == 0 else "substitute"),
                (dp[i - 1][j] + 1, "delete"),
                (dp[i][j - 1] + 1, "insert"),
            ]
            candidates.sort(key=lambda item: (item[0], priority[item[1]]))
            best_cost, best_op = candidates[0]
            dp[i][j] = best_cost
            ops[i][j] = best_op

    alignments: List[Dict[str, Optional[str]]] = []
    i = ref_len
    j = hyp_len
    while i > 0 or j > 0:
        op = ops[i][j]
        if op in {"match", "substitute"}:
            alignments.append(
                {"ref_word": ref_tokens[i - 1], "hyp_word": hyp_tokens[j - 1], "op": op}
            )
            i -= 1
            j -= 1
        elif op == "delete":
            alignments.append({"ref_word": ref_tokens[i - 1], "hyp_word": None, "op": op})
            i -= 1
        elif op == "insert":
            alignments.append({"ref_word": None, "hyp_word": hyp_tokens[j - 1], "op": op})
            j -= 1
        else:
            break

    alignments.reverse()
    return alignments


def compute_pronunciation_score(
    word_alignments: List[Dict[str, Optional[str]]],
    word_timestamps: List[Dict[str, Any]],
    wer: Optional[float],
) -> Dict[str, float]:
    ref_count = sum(1 for alignment in word_alignments if alignment.get("ref_word"))
    match_count = sum(1 for alignment in word_alignments if alignment.get("op") == "match")
    substitute_count = sum(1 for alignment in word_alignments if alignment.get("op") == "substitute")
    delete_count = sum(1 for alignment in word_alignments if alignment.get("op") == "delete")

    def clamp(value: float, minimum: float = 0.0, maximum: float = 1.0) -> float:
        return max(min(value, maximum), minimum)

    if wer is not None:
        accuracy = clamp(1.0 - wer)
    else:
        accuracy = clamp(match_count / max(1, match_count + substitute_count + delete_count))

    completeness = clamp((ref_count - delete_count) / max(1, ref_count))

    probabilities = [
        float(word.get("probability"))
        for word in word_timestamps
        if isinstance(word.get("probability"), (int, float))
    ]
    fluency = clamp(sum(probabilities) / len(probabilities)) if probabilities else 0.0

    overall = clamp((accuracy + fluency + completeness) / 3.0)
    return {
        "accuracy": accuracy,
        "fluency": fluency,
        "completeness": completeness,
        "overall": overall,
    }


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
        with tracer.start_as_current_span(
            "save_alignment_to_storage",
            kind=SpanKind.CLIENT,
            attributes={
                "session_id": session_id,
                "storage.type": "minio",
            },
        ) as span:
            object_key = f"{self.cfg.alignment_prefix}{session_id}.json"
            data = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
            self.minio.put_object(
                self.cfg.minio_bucket,
                object_key,
                io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            span.set_attribute("alignment.key", object_key)
            span.set_status(Status(StatusCode.OK))
            return object_key

    def upsert_result(
        self,
        session_id: str,
        ayah_id: int,
        audio_key: str,
        expected_text_ar: str,
        transcript: str,
        word_timestamps: List[Dict[str, Any]],
        word_alignments: List[Dict[str, Optional[str]]],
        wer: Optional[float],
        alignment_object_key: str,
    ) -> None:
        with tracer.start_as_current_span(
            "db.upsert_asr_result",
            kind=SpanKind.CLIENT,
            attributes={
                "db.operation": "upsert",
                "db.table": "asr_results",
                "session_id": session_id,
            },
        ) as span:
            with self.pg.cursor() as cur:
                cur.execute(
                """
                INSERT INTO asr_results (
                    session_id, ayah_id, audio_key, expected_text_ar,
                    transcript, word_timestamps, word_alignments, wer, alignment_object_key,
                    created_at, updated_at
                ) VALUES (%(session_id)s, %(ayah_id)s, %(audio_key)s, %(expected_text_ar)s,
                          %(transcript)s, %(word_timestamps)s, %(word_alignments)s, %(wer)s,
                          %(alignment_object_key)s,
                          NOW(), NOW())
                ON CONFLICT (session_id) DO UPDATE
                SET audio_key = EXCLUDED.audio_key,
                    expected_text_ar = EXCLUDED.expected_text_ar,
                    transcript = EXCLUDED.transcript,
                    word_timestamps = EXCLUDED.word_timestamps,
                    word_alignments = EXCLUDED.word_alignments,
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
                    "word_alignments": json.dumps(word_alignments, ensure_ascii=False),
                    "wer": wer,
                    "alignment_object_key": alignment_object_key,
                },
            )
            span.set_status(Status(StatusCode.OK))

    def update_alignment_reference(self, session_id: str, alignment_object_key: str) -> None:
        with tracer.start_as_current_span(
            "db.update_alignment_reference",
            kind=SpanKind.CLIENT,
            attributes={
                "db.operation": "update",
                "db.table": "user_data_objects",
                "session_id": session_id,
            },
        ) as span:
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
            span.set_status(Status(StatusCode.OK))

    def update_scoring_job_score(self, session_id: str, score: float) -> None:
        with tracer.start_as_current_span(
            "db.update_scoring_job_score",
            kind=SpanKind.CLIENT,
            attributes={
                "db.operation": "update",
                "db.table": "scoring_jobs",
                "session_id": session_id,
                "score": score,
            },
        ) as span:
            with self.pg.cursor() as cur:
                cur.execute(
                    """
                    UPDATE scoring_jobs
                    SET score = %(score)s
                    WHERE session_id = %(session_id)s;
                    """,
                    {"session_id": session_id, "score": score},
                )
            span.set_status(Status(StatusCode.OK))


class AsrWorker:
    def __init__(self, cfg: WorkerConfig, transcriber: Optional[Transcriber] = None):
        self.cfg = cfg
        self.redis = redis.from_url(cfg.redis_url)
        self.writer = ResultWriter(cfg)
        self.transcriber: Transcriber = transcriber if transcriber is not None else build_transcriber(cfg)

    def _download_audio(self, audio_key: str) -> str:
        with tracer.start_as_current_span(
            "download_audio",
            kind=SpanKind.CLIENT,
            attributes={
                "audio.key": audio_key,
                "storage.type": "minio",
            },
        ) as span:
            _, temp_path = tempfile.mkstemp(prefix="quran-audio-", suffix=".opus")
            try:
                self.writer.minio.fget_object(self.cfg.minio_bucket, audio_key, temp_path)
                file_size = os.path.getsize(temp_path)
                span.set_attribute("audio.size_bytes", file_size)
                span.set_status(Status(StatusCode.OK))
                return temp_path
            except S3Error as err:
                span.set_status(Status(StatusCode.ERROR, f"MinIO error: {err}"))
                span.record_exception(err)
                logger.error("failed to download %s: %s", audio_key, err)
                raise

    def _transcribe(self, audio_path: str, expected_text_ar: str) -> Tuple[str, List[Dict[str, Any]]]:
        result = self.transcriber.transcribe(audio_path, expected_text_ar)
        return result.transcript, result.words

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

        # Extract trace context from job payload for distributed tracing
        trace_ctx = job.get("trace_context") or {}
        parent_context = extract(trace_ctx) if trace_ctx else context.get_current()

        enqueued_at = parse_enqueued_at(job.get("enqueued_at"))
        if enqueued_at:
            queue_wait_ms = (datetime.now(timezone.utc) - enqueued_at).total_seconds() * 1000
            queue_wait_histogram.record(queue_wait_ms, {"session_id": session_id})
            logger.info("queue wait recorded session_id=%s wait_ms=%.2f", session_id, queue_wait_ms)

        processing_start = time.perf_counter()
        with tracer.start_as_current_span(
            "worker.process_job",
            context=parent_context,
            kind=SpanKind.CONSUMER,
            attributes={
                "session_id": session_id,
                "audio_key": audio_key,
                "ayah_id": ayah_id,
            },
        ) as span:
            audio_path = self._download_audio(audio_key)

            # Record audio upload metrics
            file_size = os.path.getsize(audio_path)
            user_id = job.get("user_id", "unknown")
            audio_upload_counter.add(1, {"user_id": user_id})
            audio_upload_size_histogram.record(file_size, {"user_id": user_id})

            try:
                transcript, words = self._transcribe(audio_path, expected_text_ar)
            finally:
                try:
                    os.remove(audio_path)
                except OSError:
                    pass

            # Compute alignment and scoring with span
            with tracer.start_as_current_span(
                "compute_alignment_score",
                attributes={
                    "alignment.reference_words": len(expected_text_ar.split()) if expected_text_ar else 0,
                    "alignment.hypothesis_words": len(transcript.split()),
                },
            ) as align_span:
                wer = compute_wer(expected_text_ar, transcript) if expected_text_ar else None
                word_alignments = align_words(expected_text_ar, transcript)
                pronunciation_score = compute_pronunciation_score(word_alignments, words, wer)
                if wer is not None:
                    align_span.set_attribute("score.wer", wer)
                align_span.set_attribute("score.accuracy", pronunciation_score["accuracy"])
                align_span.set_attribute("score.overall", pronunciation_score["overall"])
                align_span.set_status(Status(StatusCode.OK))

            alignment_payload = {
                "session_id": session_id,
                "ayah_id": ayah_id,
                "audio_key": audio_key,
                "expected_text_ar": expected_text_ar,
                "transcript": transcript,
                "word_timestamps": words,
                "word_alignments": word_alignments,
                "pronunciation_score": pronunciation_score,
            }
            alignment_key = self.writer.save_alignment(session_id, alignment_payload)

            self.writer.upsert_result(
                session_id=session_id,
                ayah_id=ayah_id,
                audio_key=audio_key,
                expected_text_ar=expected_text_ar,
                transcript=transcript,
                word_timestamps=words,
                word_alignments=word_alignments,
                wer=wer,
                alignment_object_key=alignment_key,
            )
            self.writer.update_alignment_reference(session_id, alignment_key)

            # Update scoring_jobs with pronunciation score
            self.writer.update_scoring_job_score(session_id, pronunciation_score["overall"])

            # Record business metrics
            job_status_counter.add(1, {"status": "success", "ayah_id": str(ayah_id)})
            if wer is not None:
                transcription_wer_histogram.record(wer, {"ayah_id": str(ayah_id)})
            pronunciation_score_histogram.record(
                pronunciation_score["overall"],
                {
                    "ayah_id": str(ayah_id),
                    "accuracy_bucket": get_accuracy_bucket(pronunciation_score["accuracy"]),
                },
            )

            # Set span status
            span.set_status(Status(StatusCode.OK))

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
                ayah_id = job.get("ayah_id", "unknown") if isinstance(job, dict) else "unknown"
                error_type = type(err).__name__
                job_status_counter.add(1, {"status": "failed", "error_type": error_type, "ayah_id": str(ayah_id)})
                logger.exception("failed to process job session_id=%s: %s", session_id, err)


def main() -> None:
    cfg = WorkerConfig.from_env()
    transcriber = build_transcriber(cfg)
    start_healthz_server(cfg.healthz_port, transcriber.name)
    worker = AsrWorker(cfg, transcriber=transcriber)
    worker.run_forever()


if __name__ == "__main__":
    main()
