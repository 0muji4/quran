# ADR 0019: Backend-inline ASR Supersedes Worker-based Pipeline

- Status: Accepted
- Date: 2026-06-19
- Author: motoshi.suzuki
- Supersedes: [ADR 0013](./0013-pluggable-asr-backend.md) (Pluggable ASR Backend in the Worker)
- Related: [ADR 0010](./0010-gcp-cloud-run-deployment.md), [ADR 0011](./0011-cloud-portability-principle.md), [docs/free-tier-verification-troubleshooting.md](../free-tier-verification-troubleshooting.md)

## Context

ADR 0013 specified a `Transcriber` protocol inside the Python worker so the ASR backend could be swapped between local faster-whisper, remote Hugging Face endpoints, and AWS Inferentia2 without touching the queue-and-storage loop. Two assumptions held at the time:

1. Transcription is slow enough (multi-second on CPU faster-whisper) that the request path must be asynchronous, with the worker pulling jobs off Redis and the BFF polling for results.
2. The choice of ASR backend is open, and a Python `Protocol` is the lightest abstraction that lets us evaluate alternatives without recommitting to a single vendor.

Two things have since changed.

First, Google Cloud Speech-to-Text v2 with the `chirp_3` model returns in 1–3 seconds end-to-end (measured against a 3-second ayah recording in [docs/free-tier-verification-troubleshooting.md](../free-tier-verification-troubleshooting.md) §6 — 2.6 seconds for the first request including BFF round-trip and DB write). At that latency, the async + polling overhead is a net negative: the BFF has to maintain a polling loop, the Android / iOS clients have to handle intermediate states, and the user waits longer overall than a direct synchronous call.

Second, Phase 5 verification (PRs #429 through #444) ported the Arabic helpers and the pronunciation aggregator from Python to Go, added a Go S3-compatible storage adapter, and wired a synchronous `Engine.Score` in `apps/backend/internal/scoring` that calls Speech-to-Text v2 directly from the backend's HTTP handler. The full path was exercised on real Android hardware against a $0 cloud deployment (GCP + Neon + Cloudflare R2 + Render Singapore) and produced a real pronunciation score. The async fallback this ADR is superseding has not been invoked from any production code path since #433 merged.

## Decision

Decommission the Python worker entirely. All ASR + scoring work runs inside the Go backend's synchronous request handler. Specifically:

- The Worker app (`apps/worker/`, both Python and the Go scaffold) is deleted.
- The backend's queue producer (`apps/backend/internal/enqueue/`) and the shared Go queue library (`packages/go-pkg/queue/`) are deleted. Neither has been called from production code since the sync handler landed in PR #433.
- The Redis service is removed from `ops/docker/compose.dev.yml`. The Terraform `memorystore-redis` module and its references in `ops/terraform/envs/{prod,staging}/main.tf` are deleted.
- CI workflow jobs that build the worker (Python pytest, worker Go test target) are removed from `.github/workflows/ci.yml`.
- ADR 0013 is marked Superseded.

The `Transcriber` protocol idea is preserved on the Go side as `apps/backend/internal/transcribe/Transcriber`. The pluggability story it provides — swap to a different ASR vendor by writing a new implementation of one interface — survives the move; only the host process changes from Python worker to Go backend.

## Rationale

### Why a synchronous Go handler is now better than the worker + queue

The original case for async was latency. Phase 5 verification disproves the premise: the 95th percentile of the new path is bounded by Chirp 3 itself, which is fast enough that no buffer is needed. The async path was paying for a property the system no longer needs.

The remaining cost of keeping the worker is non-trivial:

- Two services to deploy, two health checks, two sets of OpenTelemetry instrumentation.
- A Redis cluster (or Memorystore instance in production) that exists solely to hold a queue with single-digit messages.
- A polling loop in the BFF that the Android / iOS clients have to thread state through (status enum, intermediate `RUNNING` state, retry budget).
- A second language runtime (Python) that the team has to maintain, vendor, and dependency-scan.

None of these costs are justified by latency, throughput, or reliability properties of the new system. Removing them reduces the deployable surface area, removes one of the two language stacks, and collapses a polling-and-state-machine flow into a single HTTP request.

### Why now

Phase 5 verification is the trigger condition ADR 0013 implicitly relied on: "we will know if the async backend can be removed when a synchronous managed STT lands". That trigger fired on 2026-06-18 when the Android client produced a pronunciation score against the new path end-to-end.

Waiting longer to retire the worker means continuing to pay the costs above for a path no longer in use, and risks the dead code path silently bit-rotting (worker depends on Python packages that themselves change; Redis client semantics drift across versions; etc.).

### Known degradation: word-level confidence

The `chirp_3` model (Preview, the only Speech v2 model with Arabic support) does not return per-word probabilities. The pronunciation aggregator's fluency component depended on this signal and now returns 0 for every recording. Overall scores are still meaningful because accuracy + completeness dominate the weighted mean, but fluency-as-reported is no longer informative until Google ships per-word probabilities for `chirp_3` or a successor model.

This is a regression relative to ADR 0013's faster-whisper path, which did return word probabilities. We accept it because:

- The other costs of keeping the worker (above) are paid every day.
- The fluency component is recoverable: when Google ships word-level probabilities, the `transcribe.Transcriber` Go interface lets us re-enable them without touching the request handler.
- Pre-Phase-5 verification, no user had ever seen a fluency score from this app in production — there is no UX regression today.

## Consequences

- The repo loses one app (`apps/worker/`), one shared Go package (`packages/go-pkg/queue/`), one backend internal package (`apps/backend/internal/enqueue/`), and one Terraform module (`ops/terraform/modules/memorystore-redis/`). Total deletion footprint is roughly 1500 LOC, dominated by the Python worker.
- The Go backend gains the entire ASR responsibility. CPU and memory profile on production deploy will change accordingly. On Render free-tier verification the synchronous handler peaked at ~150 MB while Chirp 3 was active; production sizing should plan for that.
- The `RUNNING` scoring state in the DB is technically vestigial under the new path (a synchronous handler either writes `COMPLETED` or `FAILED`) but kept because removing it would require a CHECK-constraint migration and gain nothing. A future schema cleanup can drop it.
- The DD `docs/dd/teacher-voice-and-pronunciation-feedback.md` describes the worker architecture in detail. A header note is added pointing readers to this ADR and the verification doc; the DD body is left as historical reference rather than rewritten in place.
- `BFF → Worker` polling code in BFF and clients was already removed by PR #433. No additional client work is implied by this ADR.

## Reconsider triggers

Revisit this decision and consider re-introducing an async tier if any of the following becomes true:

- Per-request Chirp latency exceeds ~10 seconds for a meaningful fraction of recordings (e.g., long ayahs or non-trivial regional drift).
- Cost of synchronous Speech-to-Text exceeds an async batch alternative by more than ~3x at the call volumes the product reaches.
- A privacy or compliance requirement forbids audio leaving the backend's network (e.g., on-prem deployment for a school district), making a local-only worker the only viable path.

None of these are forecast for the foreseeable roadmap.
