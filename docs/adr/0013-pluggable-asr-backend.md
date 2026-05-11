# ADR 0013: Pluggable ASR Backend in the Worker

- Status: Accepted
- Date: 2026-05-11
- Author: motoshi.suzuki
- Related: [ADR 0010](./0010-gcp-cloud-run-deployment.md), [ADR 0011](./0011-cloud-portability-principle.md)

## Context

The Worker is the ASR (Automatic Speech Recognition) and pronunciation-scoring component. Until this ADR, it instantiated `faster_whisper.WhisperModel` directly inside `AsrWorker.__init__` and called `model.transcribe(...)` inline in `_transcribe`. Two unrelated needs have now converged on the same code path:

1. **ADR 0010 needs Cloud Run liveness.** Cloud Run requires the container to bind `$PORT` and answer HTTP within ~240 s of cold start. The Worker is a long-running consumer (`redis.brpop` loop) with no HTTP surface today, so a `/healthz` endpoint must be added.
2. **The ASR roadmap (deployment plan Phase 11+, and the Tilawah voice/pronunciation feedback DD) anticipates switching the inference backend** — faster-whisper on CPU now, faster-whisper on Cloud Run L4 GPU later, possibly Hugging Face Inference Endpoints, possibly AWS Inferentia2 as a remote service. Coupling the queue-and-storage loop to a specific local-Python model class makes those switches harder than they need to be.

The deployment plan (`~/.claude/plans/backend-frontend-worker-nifty-muffin.md`) and ADR 0011 (cloud portability) both anticipate this separation. This ADR codifies the boundary.

## Decision

The Worker's transcription step is **a single Python `Protocol` named `Transcriber`** with one method:

```python
class Transcriber(Protocol):
    name: str
    def transcribe(self, audio_path: str, expected_text_ar: str) -> TranscriptionResult: ...
```

where

```python
@dataclass
class TranscriptionResult:
    transcript: str
    words: List[Dict[str, Any]]
```

The current implementation, `FasterWhisperLocalTranscriber`, holds a `WhisperModel` and runs inference in-process — exactly what the previous inline code did. `AsrWorker` no longer owns a `WhisperModel`; it owns a `Transcriber`, resolved at construction time by `build_transcriber(cfg)`, which switches on the `ASR_BACKEND` environment variable (default `faster-whisper-local`).

A new ASR backend is added by:

1. Implementing a class that satisfies the `Transcriber` protocol (a `name` class attribute and a `transcribe` method returning `TranscriptionResult`).
2. Adding a branch in `build_transcriber(cfg)` keyed on `cfg.asr_backend`.
3. Setting `ASR_BACKEND=<new-name>` (and any backend-specific env) in the relevant Cloud Run service.

No queue, storage, scoring, alignment, or observability code changes.

The Worker also gains a tiny `/healthz` HTTP server (stdlib `http.server` running in a daemon thread) that returns `200 OK` with `{"status": "ok", "asr_backend": "<name>"}`. Required for Cloud Run; useful locally for confirming which backend a deployed container is running.

## Rationale

### Why a Protocol, not a base class or an abstract class

Python `typing.Protocol` is structural — any class with the right shape satisfies it, without inheritance. That matters because future backends may be thin adapters over an SDK (`openai.audio.transcriptions`, `huggingface_hub.InferenceClient`, AWS SDK clients), and inheriting from a project-local abstract class adds friction in those adapters without buying anything. The contract is the method signature.

### Why the boundary is `transcribe(audio_path, expected_text_ar) -> TranscriptionResult`, not something narrower

The Worker's downstream code (`process_job`) needs both the final transcript string *and* per-word timestamps + probabilities for alignment and pronunciation scoring. A narrower boundary (just the transcript) would force every future backend to also emit timestamps in our shape — which managed APIs typically do — and would push timestamp normalisation into many places. The current shape is the smallest interface that lets the downstream code remain backend-agnostic.

### Why not abstract at the HTTP boundary instead

Tempting: stand up an "ASR microservice" in front, have the Worker hit HTTP. Rejected for now:

- It doubles the moving parts (extra service, extra deploy) for zero benefit at MVP scale.
- The boundary already exists *inside* the Worker process at a clean place.
- A future "ASR microservice" implementation of `Transcriber` is itself just one more class implementing the protocol — `RemoteAsrServiceTranscriber(url)` calling out via HTTP. The protocol absorbs that case without changing the consumer.

### Why `/healthz` uses stdlib `http.server` instead of aiohttp / FastAPI

The Worker has one endpoint with a hardcoded response. `http.server` is ~30 lines of Python and zero new dependencies. aiohttp / FastAPI would add an event-loop concern that conflicts with the synchronous `redis.brpop` loop and a heavy dependency for no functional benefit.

### Why the server runs in a daemon thread

The Worker's main loop is synchronous (`redis.brpop` blocks for up to 5 s per iteration). Running the HTTP server in a daemon thread lets it respond to Cloud Run's liveness probe at any time, without restructuring the queue loop to async. Daemon = the process exits cleanly when the main loop terminates; no thread shutdown plumbing required for a stateless health endpoint.

## Consequences

Positive:

- Cloud Run deploys the Worker as a normal HTTP service with `min=1`, `max=1`, CPU always allocated, ingress=none (deployment plan §Per-App Plan).
- Adding `FasterWhisperGPUTranscriber` (same image, `WHISPER_DEVICE=cuda`, runs on Cloud Run L4) becomes a tiny class change.
- A future migration to a remote inference service (AWS Inferentia2, HF Inference Endpoints) is a configuration flag plus one new class — not a re-architecture.
- The ASR roadmap can iterate independently of the deployment platform, satisfying ADR 0011's portability principle.

Negative:

- A small layer of indirection between `AsrWorker.process_job` and the model call. Trivial; the test suite continues to pass with no semantic changes.
- One more environment variable (`ASR_BACKEND`) to track per environment.
- The HTTP server adds a port the container must own. `PORT=8080` is the documented default, matching Cloud Run; locally the Worker container in `compose.dev.yml` does not need to publish it to the host, so no port collision.

## Implementation Notes

- `transcribe_audio` OpenTelemetry span is now produced inside `FasterWhisperLocalTranscriber.transcribe`, not in `AsrWorker._transcribe`. Other backends should emit an equivalent span so traces remain comparable across backends.
- `AsrWorker._transcribe` is preserved as a thin tuple-returning wrapper so the existing test suite continues to mock `_transcribe` and `_download_audio` independently. New backend tests should target `Transcriber` directly.
- `HealthzHandler.asr_backend` is set as a class attribute once at startup. There is exactly one Worker process per container, so no per-request mutation is needed.

## Alternatives Considered

- **Keep direct WhisperModel usage and add `/healthz` only.** Rejected: defers the ASR roadmap headroom we already know is coming and risks making the necessary refactor land under deadline pressure later.
- **Abstract at a class hierarchy (`abc.ABC` + `abstractmethod`).** Rejected for the reasons in Rationale §1 (Protocol).
- **Run the HTTP server as a sibling process via `tini` / `s6-overlay`.** Rejected: overkill for one endpoint; conflicts with Cloud Run's "one container = one process tree" expectation.
- **Use FastAPI + Uvicorn.** Rejected on dependency-weight grounds; the only routes the Worker will ever expose are health / readiness probes.

## References

- `apps/worker/python/main.py` — `Transcriber`, `FasterWhisperLocalTranscriber`, `build_transcriber`, `HealthzHandler`, `start_healthz_server`
- `apps/worker/Dockerfile` — `EXPOSE 8080`, `PORT=8080`
- `apps/worker/python/tests/test_worker.py` — backend factory and `/healthz` coverage
- [ADR 0010](./0010-gcp-cloud-run-deployment.md) — Cloud Run liveness requirement that motivates `/healthz`
- [ADR 0011](./0011-cloud-portability-principle.md) — portability principle this ADR operationalises in the Worker
- `~/.claude/plans/backend-frontend-worker-nifty-muffin.md` — deployment plan, Phase 3
