# ADR 0001: Skip Kubernetes for Now

- Status: Superseded by [ADR 0010](./0010-gcp-cloud-run-deployment.md) on 2026-05-11
- Date: 2026-05-08
- Author: motoshi.suzuki

## Context

quran-project is at `0.1.0`, developed by a single engineer, and oriented around a mobile-first experience (iOS / Android clients plus a Next.js web surface). Today the entire stack — `apps/web`, `apps/bff`, `apps/backend`, `apps/worker/python`, plus Postgres 16, Redis 7, MinIO, OpenTelemetry Collector, Jaeger, Prometheus, Loki, and Grafana — runs locally through a single `ops/docker/compose.dev.yml` (11 services). There is no production deployment of any kind: no image push pipeline, no managed registry, no Helm / Kustomize / Terraform, no PaaS configuration. CI (`.github/workflows/{ci,test,e2e}.yml`) only runs tests against the same Compose stack.

The question raised: should we follow a sibling project that recently migrated from `docker-compose` to a Kustomize + Skaffold Kubernetes setup?

## Decision

**We will not migrate to Kubernetes now.** Compose remains the standard for local development. When production becomes a concrete goal, the first deployment target will be a managed PaaS, not a Kubernetes cluster.

## Rationale

The classical justifications for Kubernetes do not apply to this codebase today:

- **Rolling updates / zero-downtime deploys.** No production deployment exists, so there is nothing to roll out and no downtime to avoid.
- **Horizontal scale across nodes.** Pre-release with no live users; PaaS auto-scaling will cover any realistic near-term load.
- **Self-healing.** Already covered by Compose's `restart: unless-stopped`.
- **Declarative config.** Compose is also declarative; there is no production environment to reproduce.
- **Service discovery / multi-tenant isolation.** Topology is fixed at 11 services; no churn.
- **Secret management.** k8s would not improve on the current Compose approach without additional tooling (sealed-secrets, external-secrets) that itself requires a cluster.

A relevant reference point is the sibling project's k8s setup. Its `k8s/README.md` cites HA, self-healing, persistent state, and zero-downtime deploys as motivations, yet the implementation pins every service to `replicas: 1`, has no overlays, no observability, no ingress, no managed cluster target, and no CI deployment step. The migration is performative rather than load-bearing — adopting the same pattern here would import the cost without the benefit.

Migrating now would add: kubectl/kustomize/helm fluency, a local cluster runtime (minikube/kind/Docker Desktop k8s) for 11 services, re-platforming the existing Compose-based observability stack, ongoing managed-cluster spend (~USD 70+/month minimum on GKE/EKS/AKS), and a Skaffold/Tilt-style inner-loop choice. None of this advances the current product roadmap (Tilawah followups, BFF persistence, auth, accessibility).

This decision aligns with the stated engineering principle of avoiding unnecessary abstraction and means-as-ends.

## Consequences

Positive:

- Engineering attention stays on product work and the Tilawah follow-up roadmap.
- Local development loop remains fast and well-documented (`make dev-up`).
- The existing Compose-based observability stack does not need to be re-platformed.
- Avoids ongoing managed-cluster cost while there is no traffic to justify it.

Negative:

- When production work begins, a PaaS deploy path must be built from scratch (no infrastructure-as-code exists today). Estimated ~2–3 days for a first cut: production Dockerfile stages, GHCR push workflow, PaaS deploy.
- Kubernetes operational skill must be developed outside this repository (e.g. on the sibling project), not by running this one on a cluster.
- If a future requirement demands k8s features that PaaS cannot offer, a second migration will be needed. The triggers below are intended to detect that case early.

## Reconsideration Triggers

Re-open this decision when **two or more** of the following hold:

1. Monthly active users reach four digits and the chosen PaaS tier begins to throttle concurrency.
2. The Python ASR worker's CPU envelope consistently exceeds the highest single-instance plan available on the PaaS.
3. Postgres requires HA / read replicas beyond what the managed DB tier provides.
4. The development team grows to three or more engineers and per-environment (dev / staging / prod) declarative configuration becomes necessary.
5. SLOs and an on-call rotation are introduced, requiring automated rollback or progressive delivery.
6. A Kubernetes cluster is already operated by an adjacent project and this workload can co-tenant on it at near-zero marginal operational cost.

Until then, develop on Compose, ship to PaaS.

## Alternatives Considered

- **Kubernetes now (Kustomize + Skaffold, sibling-project style).** Rejected: imports complexity, cost, and a steep learning curve while solving zero current problems.
- **Managed PaaS (Cloud Run / Fly.io / Render) with managed Postgres / Redis / object storage.** Preferred path for the first production deployment. Tracked separately from this ADR.
- **Bare VM with `systemd` units.** Rejected: heavier operational burden than PaaS without compensating benefits.

## References

- `ops/docker/compose.dev.yml` — current deployment surface
- `ops/observability/README.md` — existing OTel / Jaeger / Prom / Loki / Grafana wiring
- `.github/workflows/{ci,test,e2e}.yml` — current CI scope (tests only, no deploy)
- Sibling project `Twitter-Clone/k8s/` and `Twitter-Clone/skaffold.yaml` — comparison case for a recent k8s migration
- Project engineering principles — guidance on avoiding unnecessary abstraction and means-as-ends decisions
