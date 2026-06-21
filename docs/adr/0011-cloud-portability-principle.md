# ADR 0011: Cloud Portability Principle

- Status: Accepted
- Date: 2026-05-11
- Author: motoshi.suzuki
- Related: [ADR 0010](./0010-gcp-cloud-run-deployment.md) (GCP Cloud Run as the First Production Deployment Target)

## Context

ADR 0010 commits the project to Google Cloud Platform as the first production deployment target, and lists reconsideration triggers — most notably Africa expansion, an organisation-level AWS contract, or an Inferentia2 cost win on ASR inference — that could pull the workload to AWS in future.

The risk that follows from a single-cloud choice is **gravitational lock-in**: managed services that solve a problem so well that they become structurally expensive to leave, even when the original economic or geographic reason for the cloud choice has reversed. Examples from neighbouring teams: workloads that adopted DynamoDB single-table designs and could not afford to re-shape data for Postgres years later; identity stacks rooted in Cognito that pinned authentication infrastructure to AWS independently of where the rest of the workload ran.

This ADR pre-commits to a portability budget so that the AWS migration path from ADR 0010's triggers stays bounded to "rewrite IaC + retarget image push" rather than "redesign data and identity models."

The product surface explicitly in scope: Web, BFF, Backend, Worker, their data stores, their queue, their object storage, and their observability pipeline. The portability concern does not extend to developer tooling (CI providers, secret managers used only in CI, code-scanning vendors) which are independently replaceable.

## Decision

The project will not adopt **cloud-vendor-specific managed services** for any concern that has a portable open-standard alternative already in use.

**Disallowed without an explicit superseding ADR:**

| Class                                                     | Disallowed examples                                                                                            | Portable alternative in use                                                                              |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Managed AI/ML platform                                    | Vertex AI, AWS Bedrock, SageMaker for hosted models                                                            | Self-hosted inference (Faster-Whisper today; HF Inference Endpoints if vendor-neutral hosting is wanted) |
| Identity-as-a-Service                                     | AWS Cognito, GCP Identity Platform, Firebase Auth                                                              | BFF-issued JWT + refresh token already implemented                                                       |
| Vendor-specific NoSQL                                     | DynamoDB, Firestore, Spanner                                                                                   | PostgreSQL (with `jsonb` columns when document shape is genuinely needed)                                |
| Vendor-specific stream/queue                              | AWS Kinesis, GCP Pub/Sub for the primary work queue                                                            | Redis lists (`BLPOP`) — current contract                                                                 |
| Vendor-specific workflow engine                           | AWS Step Functions, GCP Workflows                                                                              | Application-level coordination in Backend / Worker                                                       |
| Vendor-specific search                                    | OpenSearch Service, Algolia for core indexing                                                                  | Postgres full-text (`tsvector`) or self-hosted OpenSearch container                                      |
| Storage vendor extensions                                 | S3 Object Lambda, S3 Select, GCS Pub/Sub notifications coupling product logic                                  | S3-compatible primitives (PutObject, GetObject, signed URLs) only                                        |
| Vendor-specific CDN-edge compute coupled to product logic | CloudFront Functions / Lambda@Edge encoding business rules; Cloud CDN custom origin VCL with product semantics | Plain CDN caching only; logic stays in BFF                                                               |

**Explicitly allowed**, because they expose standard interfaces and have one-to-one analogues across major clouds:

- Managed Postgres (Cloud SQL ↔ RDS ↔ Aurora ↔ Fly Postgres) — wire protocol is the contract.
- Managed Redis (Memorystore ↔ ElastiCache ↔ Upstash) — protocol is the contract.
- Object storage with the S3 protocol (GCS via HMAC ↔ S3 ↔ R2 ↔ MinIO).
- Container compute that runs an OCI image with HTTP ingress and env-var configuration (Cloud Run ↔ App Runner ↔ ECS Fargate ↔ Fly Machines).
- Container Jobs / one-shot runners (Cloud Run Jobs ↔ ECS run-task) — used only as "run this image, return exit code."
- Managed Secret store accessed at deploy time only (Secret Manager ↔ AWS Secrets Manager) — application reads from env, not from vendor SDK.
- OpenTelemetry collector + OTLP — the destination (Cloud Trace, X-Ray, self-hosted Jaeger) is a deploy-time choice, not an application-code choice.
- Workload Identity Federation between GitHub Actions and the cloud provider — replaceable per-provider in CI, not in product code.
- Cloudflare as a vendor-neutral edge layer in front of either origin cloud.

The distinction in plain terms: a managed service is allowed if **migrating it requires changing a connection string and an IaC resource, not application code or a data model.**

## Rationale

The reconsideration triggers in ADR 0010 are realistic at multi-year horizons. The cost of acting on them when they fire is dominated by the application changes needed, not by the IaC rewrite. Pre-committing to portability collapses the dominant cost.

A short version of the same argument: most cloud lock-in pain comes from **data and identity** — both notoriously hard to migrate. Compute, queues, caches and object storage all have standard wire protocols and are comparatively easy to move. By keeping the data model in Postgres, the identity model in BFF-owned JWTs, and the queue contract in Redis primitives, the project keeps the two hardest categories portable from the start.

There is a secondary benefit: the principle gives a clear answer to the recurring temptation to adopt a vendor-specific managed service for short-term convenience. "Is this allowed under ADR 0011?" produces a fast yes/no rather than a lengthy comparison.

## Consequences

Positive:

- A future AWS migration is bounded to: rewrite `ops/terraform/`, change image push target, update WIF audience, update DNS. Application code, schema, and identity model are untouched.
- Decisions around managed-AI services, IDaaS, and proprietary databases are deferred rather than re-relitigated on every PR.
- Engineering practice naturally produces transferable skills (Postgres, Redis, S3, OTel) rather than vendor-specific ones.
- Worker's ASR backend remains pluggable; running inference on AWS Inferentia2 while the rest of the workload runs on GCP becomes a configuration change rather than a re-architecture.

Negative:

- Some "obviously good" managed services are refused. Specific near-term refusals:
  - **Vertex AI / Bedrock for hosted Whisper.** Self-host on Cloud Run (CPU now, L4 GPU later) instead.
  - **Cognito / Identity Platform for sign-in.** Continue with BFF-issued JWT.
  - **Cloud SQL IAM auth.** Use database password from Secret Manager. (Cloud SQL IAM auth would couple the app to GCP's IAM model.)
- The team forgoes some performance or convenience optimisations that only materialise as cloud-specific features. The expected magnitude is small at current scale.
- A new ADR is required to lift the restriction for any specific case — this is intentional friction but it is friction.

## Exceptions and How to Take One

A future ADR may supersede this one in part if, for a specific service, the cost-benefit analysis demonstrably reverses. Required content for any such ADR:

1. The specific vendor-managed service proposed and the portable alternative being displaced.
2. The quantified benefit (latency, cost, engineering hours saved per quarter).
3. The migration plan if the project ever needs to leave that vendor — including data export path and rollback cost.
4. Whether the change touches the data model or only the deploy layer. Data-model changes require explicit acceptance of the increased switch cost.

Without those elements, this ADR stands.

## Alternatives Considered

- **Adopt cloud-native managed services freely as needed.** Rejected: lowest short-term friction but compounds switch cost. Past experience on neighbouring projects (DynamoDB, Cognito) shows the cost is consistently underestimated until the migration is mandatory.
- **Pre-build an abstraction layer over every cloud SDK.** Rejected: over-engineering. Standard wire protocols (Postgres, Redis, S3, OTLP) are already the abstraction layer; reimplementing them in application code adds maintenance burden without portability gain.
- **Stay strictly cloud-agnostic (avoid managed Postgres / Redis / object storage entirely).** Rejected: refuses the legitimate productivity benefit of managed primitives that _do_ have portable wire protocols. The principle is "no vendor-specific _behaviour_", not "no vendor-managed _capacity_."

## References

- [ADR 0010](./0010-gcp-cloud-run-deployment.md) — the cloud-choice decision this principle constrains
- `apps/bff/src/storage/*.ts` — illustrates the principle: BFF talks S3 protocol to whatever the env points at (MinIO locally, GCS in cloud, S3 if migrated)
- `apps/worker/python/main.py` — Redis BLPOP queue contract preserved across clouds
- Internal deployment plan — operationalises both ADRs
