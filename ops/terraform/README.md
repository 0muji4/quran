# `ops/terraform`

Terraform code for provisioning the GCP Cloud Run footprint described in
[ADR 0010](../../docs/adr/0010-gcp-cloud-run-deployment.md), respecting the
cloud-portability constraints in [ADR 0011](../../docs/adr/0011-cloud-portability-principle.md).

This Issue (#229) lands the **skeleton with no live resources**. No
`terraform apply` is intended yet; the goal is `terraform fmt -check`
clean and `terraform validate` passing in every env. The user creates
GCP projects + links billing and runs `bootstrap.sh` post-merge.

## Layout

```
ops/terraform/
  versions.tf            Provider + Terraform version pins (google ~> 5.x).
  backend.tf             Empty GCS backend block; bucket/prefix pass via
                         -backend-config=backend.hcl.
  bootstrap.sh           One-time per-project setup: enables APIs, creates
                         the GCS state bucket with versioning. Idempotent.

  modules/               Reusable resource modules. Each module follows
                         the standard split:
                           main.tf       resource declarations
                           variables.tf  inputs
                           outputs.tf    exports
                           versions.tf   provider pins

    cloud-run-service/             A single Cloud Run revision + IAM
                                   bindings. Used per app (web/bff/backend).
    cloud-sql/                     Postgres 16 with private IP and
                                   automated backups.
    gcs-bucket/                    Object storage with HMAC keys exposed
                                   for the existing S3-compatible code.
    artifact-registry/             Docker repo in asia-northeast1.
    secret/                        Secret Manager secret + IAM accessors.
    service-account/               Per-app SAs with least-privilege roles.
    workload-identity-federation/  GitHub Actions ↔ GCP federation,
                                   scoped to repo + branch + environment.
    otel-collector/                Cloud Run service forwarding OTLP to
                                   Cloud Trace / Cloud Logging / Managed Prometheus.

  envs/
    staging/             Staging composition. Instantiates every module
                         with staging-scale defaults.
    prod/                Prod composition. Same code path as staging,
                         scaled up; same backend bucket, different prefix.
```

ADR 0011 compliance: every module is backed by a portable protocol —
Postgres wire-protocol, Redis, S3 (HMAC), OTLP. No Vertex AI / Firestore /
Spanner / Dataflow.

## Bootstrap → init → plan → apply flow

Per environment (`staging`, then `prod`):

1. **Create the GCP project** outside Terraform (it owns billing linkage,
   which is a user task — see
   [ADR 0010 "Open questions"](../../docs/adr/0010-gcp-cloud-run-deployment.md)).
   Link billing to the project.

2. **Bootstrap** the state bucket and enable APIs:
   ```sh
   PROJECT_ID=quran-staging REGION=asia-northeast1 ./bootstrap.sh
   ```
   Re-running is safe; the script noops if the bucket exists.

3. **Configure the backend** for the env:
   ```sh
   cd envs/staging
   cp backend.hcl.example backend.hcl
   # set bucket=<state-bucket-from-bootstrap>, prefix=staging
   ```

4. **Configure variables** (project_id, billing_account, etc.):
   ```sh
   cp terraform.tfvars.example terraform.tfvars
   $EDITOR terraform.tfvars
   ```

5. **Init and plan**:
   ```sh
   terraform init -backend-config=backend.hcl
   terraform validate
   terraform plan
   ```

6. **Apply** (only after the plan is reviewed):
   ```sh
   terraform apply
   ```

## CI verification

Without GCP credentials, the following must remain clean as part of CI
for every PR that touches this directory:

```sh
terraform fmt -check -recursive ops/terraform/
cd ops/terraform/envs/staging && terraform init -backend=false && terraform validate
cd ops/terraform/envs/prod    && terraform init -backend=false && terraform validate
bash -n ops/terraform/bootstrap.sh
```

The `-backend=false` flag tells `terraform init` to skip backend
initialisation (which would require credentials).

## Required environment variables

| Var | Purpose | Example |
| --- | --- | --- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service account key, used by the google providers when running locally. CI uses Workload Identity Federation instead. | `~/.config/gcloud/application_default_credentials.json` |
| `TF_VAR_project_id` | Override `project_id` from CLI / CI without editing tfvars. | `quran-staging` |

## Out of scope (separate follow-ups)

- GCP project creation + billing linkage — user task.
- `terraform apply` against staging / prod — user task post-merge.
- GitHub Actions deploy workflows (`deploy-staging.yml` etc.) — Phase 7.
- DNS / Cloudflare layer — Phase 9.
