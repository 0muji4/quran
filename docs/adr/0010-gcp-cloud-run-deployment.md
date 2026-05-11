# ADR 0010: GCP Cloud Run as the First Production Deployment Target

- Status: Accepted
- Date: 2026-05-11
- Author: motoshi.suzuki
- Supersedes: [ADR 0001](./0001-skip-kubernetes.md) (Skip Kubernetes for Now)

## Context

ADR 0001 deferred any production deployment work and stated that, when the time came, the first target would be a managed PaaS rather than Kubernetes. That moment has arrived: the mobile track (`feat/android-pr-4-backend-facade`) and the Tilawah voice/pronunciation pipeline both require a real BFF + Worker URL that is not on a developer laptop. Without a shared deployment, mobile development blocks on staging endpoints and the ASR pipeline cannot be exercised end-to-end.

The stack to deploy is fixed by the current code:

- **Web** — Next.js (`apps/web`)
- **BFF** — Node + Express + GraphQL Helix (`apps/bff`)
- **Backend** — Go HTTP API (`apps/backend`)
- **Worker** — Python long-running consumer with Faster-Whisper (`apps/worker/python`)
- **Postgres 16**, **Redis 7** (queue + cache), **MinIO-compatible** object storage
- OpenTelemetry instrumentation already wired in all four apps

The deployment environment must support: two environments (Prod + Staging), a long-running queue consumer (Redis `BLPOP`), one-shot migration execution, automated CI/CD without static cloud keys, and a clear cost profile for a single-engineer team.

## Decision

The first production deployment target is **Google Cloud Platform**, organised as follows:

| Concern | Choice |
|---|---|
| Compute (Web / BFF / Backend / Worker) | **Cloud Run** services, region `asia-northeast1` |
| Worker pattern | Cloud Run service with `min=1`, `max=1`, CPU always allocated, `/healthz` HTTP endpoint alongside the BLPOP loop |
| Database | **Cloud SQL for PostgreSQL 16**, Private IP |
| Queue / cache | **Memorystore for Redis** (Basic 1 GiB per environment) |
| Object storage | **Google Cloud Storage**, accessed initially via HMAC + S3-compatible endpoint to preserve the existing `MINIO_*` env contract |
| Image registry | **Artifact Registry** (`asia-northeast1-docker.pkg.dev`) |
| Secrets | **Secret Manager**, injected via `gcloud run deploy --set-secrets` |
| IaC | **Terraform** under `ops/terraform/{modules,envs/{staging,prod}}`, state in a GCS bucket with object versioning |
| CI/CD | **GitHub Actions** with **Workload Identity Federation** (no static service-account keys in GitHub) |
| Branch model | `develop` → Staging (auto), `main` → Prod (manual approval gate) |
| Migrations | Replace ad-hoc `psql` script with **golang-migrate** run as a **Cloud Run Job** that gates each service deploy |
| Observability | OTel Collector on Cloud Run forwarding to **Cloud Trace**, **Cloud Logging**, **Google Managed Service for Prometheus** |
| Edge / CDN | **Cloudflare** in front of Web from Phase 9 onward |

The Worker is intentionally placed on Cloud Run rather than GCE or GKE; see Rationale §1.

The portability constraints that limit which managed services may be adopted are documented separately in [ADR 0011](./0011-cloud-portability-principle.md).

## Rationale

### 1. Worker fit
Faster-Whisper runs as a long-lived queue consumer (Redis `BLPOP`), not a request/response service. Cloud Run supports this pattern cleanly when the container exposes a `$PORT` HTTP server, is deployed with `min=1` and CPU always allocated. The BLPOP loop runs in a background task while a tiny `/healthz` handler satisfies the platform's liveness probes. This avoids operating a VM (GCE) or a cluster (GKE) for a single long-running process.

The closest AWS analogue, App Runner, has no first-class "always-on background worker" pattern, and ECS Fargate brings task definitions, services, target groups and an ALB into scope — a meaningful amount of YAML for a single-engineer team. The simplest AWS background-job pattern (SQS + Lambda) is incompatible with the existing Redis BLPOP queue without an architectural rewrite, and Lambda's 15-minute limit interacts poorly with Whisper model loading.

### 2. One-shot jobs
Cloud Run Jobs is a first-class primitive for "run this container once, fail the pipeline if it errors." Database migrations and future backfills slot into this without additional infrastructure. The AWS equivalents (ECS `run-task`, Lambda, or CodeBuild) all add either complexity or limits.

### 3. Cloud Run ↔ Cloud SQL / Memorystore
Direct VPC egress (GA) lets Cloud Run reach Cloud SQL via Private IP and Memorystore without a Serverless VPC Connector (which would add a recurring monthly charge per environment). The equivalent AWS path requires a VPC Connector resource for App Runner or full VPC plumbing for ECS, adding cost and latency.

### 4. Observability
OTel instrumentation is already in place in all four apps. Cloud Trace, Cloud Logging, and Google Managed Service for Prometheus receive OTLP natively — only the collector endpoint changes between local and production. AWS's X-Ray OTLP receiver is comparatively newer and CloudWatch's log-correlation UX is less integrated; achievable but less polished.

### 5. Region & latency
`asia-northeast1` is the closest region to the primary engineering base and the assumed initial user base. Equivalent AWS region `ap-northeast-1` is comparable. Region choice does not differentiate the clouds.

### 6. Solo-developer ergonomics
`gcloud run deploy` and `gcloud run jobs execute` are single-line commands. IAM scoping involves one role per (service-account, resource) binding; the equivalent AWS path typically spans an IAM Policy, an IAM Role, a Trust Policy and a Resource Policy. For a multi-person organisation the AWS granularity is a feature; for a one-engineer team it is friction.

### 7. ASR roadmap headroom
GCP recently shipped GPU on Cloud Run (L4). The Worker's GPU upgrade path (Phase 11+) becomes a `--gpu=l4` flag rather than a platform migration. If AWS Inferentia2 becomes economically compelling at scale, ADR 0011 keeps the migration cost bounded; the GCP origin can call an Inferentia2 inference endpoint as a remote ASR backend (the hybrid is acceptable under the pluggable-ASR-backend design noted in the deployment plan).

## Consequences

Positive:

- Concrete, repeatable path from `git push` to running service for Prod and Staging.
- Staging is infrastructurally identical to Prod, giving an honest pre-merge signal.
- OTel instrumentation, MinIO env contract, Redis BLPOP queue, multi-stage Dockerfiles, and existing CI all carry over with zero application-code rewrites on day one.
- Worker GPU path available without changing platform.
- Workload Identity Federation removes the worst secret-management failure mode (long-lived JSON keys in CI).

Negative:

- Adds an ongoing managed-services bill (estimated ~USD 140/month combined across both environments at MVP scale).
- Two cloud accounts/projects to manage (`quran-staging`, `quran-prod`).
- Memorystore Basic is the largest single line item (~$35/month per env); a cost lever exists (Upstash Redis) but is deferred under ADR 0011's portability framing.
- The team must invest in Terraform skill specifically for GCP. Skill is portable to other clouds but provider-specific resources are not.
- ADR 0001's note that "a PaaS deploy path must be built from scratch" is now realised; the work itself is in scope.

## Reconsideration Triggers

Re-evaluate the GCP choice (in particular consider AWS) when **two or more** of the following hold:

1. **Africa expansion is required.** AWS has `af-south-1` (Cape Town); GCP currently has no Africa region.
2. **ASR inference cost exceeds ~USD 500/month** *and* AWS Inferentia2 benchmarking shows a sustained >40% cost reduction over Cloud Run L4 for the same model.
3. **An organisation-level AWS contract or EDP** makes the effective AWS price materially better than GCP list.
4. **A hosted IDaaS** (AWS Cognito or similar) is adopted, making the gravity of identity infrastructure pull other workloads onto the same cloud.
5. **A specific managed service unique to another cloud** (e.g. Aurora Global Database for multi-master writes, DynamoDB Global Tables) becomes load-bearing for the product.

Until then, the deployment plan in `~/.claude/plans/backend-frontend-worker-nifty-muffin.md` is the active reference.

## Alternatives Considered

- **AWS (ECS Fargate or App Runner + RDS + ElastiCache + S3 + CloudFront).** Rejected for *this* iteration on the Worker-fit, one-shot-job, and solo-ergonomics grounds above. Reconsidered if any of the triggers above fire.
- **Fly.io (Machines + Fly Postgres + Upstash Redis + Tigris/R2).** Rejected: weaker IAM/audit story for a future enterprise context, smaller managed-services surface than GCP, and the Worker's "always-on consumer" pattern that motivates Fly.io is equally well-served by Cloud Run `min=1` + CPU always allocated.
- **Vercel for Web + GCP/Fly for the rest.** Rejected as the default: split-platform DNS, auth and CORS surface area outweighs the preview-URL DX win for a Prod + Staging topology. Revisit if PR-preview environments become a requirement.
- **Kubernetes (GKE Autopilot or self-managed).** Rejected on the same grounds as ADR 0001; reasoning unchanged. The triggers in ADR 0001 still apply for k8s reconsideration specifically.

## References

- `~/.claude/plans/backend-frontend-worker-nifty-muffin.md` — full deployment plan this ADR implements
- [ADR 0001](./0001-skip-kubernetes.md) — superseded; reasoning carried forward
- [ADR 0011](./0011-cloud-portability-principle.md) — portability constraints on cloud-specific managed services
- `ops/docker/compose.dev.yml` — local stack that remains unchanged
- `apps/backend/internal/queue/enqueuer.go`, `apps/worker/python/main.py` — Redis BLPOP queue contract preserved on Memorystore
- `docs/dd/teacher-voice-and-pronunciation-feedback.md` — ASR roadmap context
