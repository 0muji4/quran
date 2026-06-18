#!/usr/bin/env bash
# bootstrap.sh — one-time setup for a fresh GCP project before
# `terraform init`. Resolves the chicken-and-egg of where Terraform
# state lives by creating the GCS state bucket here, then enabling
# every API the Terraform modules depend on. Idempotent: each call
# is safe to re-run.
#
# Usage:
#   PROJECT_ID=quran-staging REGION=asia-northeast1 ./bootstrap.sh
#
# Requires: gcloud CLI authenticated as a user with project owner
# (or equivalent) permission on $PROJECT_ID.

set -euo pipefail

: "${PROJECT_ID:?PROJECT_ID env var is required (e.g. quran-staging)}"
REGION="${REGION:-asia-northeast1}"
STATE_BUCKET="${STATE_BUCKET:-${PROJECT_ID}-tf-state}"

echo "==> project=$PROJECT_ID region=$REGION state_bucket=$STATE_BUCKET"

echo "==> Setting active project"
gcloud config set project "$PROJECT_ID" >/dev/null

echo "==> Enabling required GCP APIs"
# Each API maps to a Terraform module under modules/. Adding a module
# typically means adding an entry here.
APIS=(
  artifactregistry.googleapis.com
  cloudbilling.googleapis.com
  cloudbuild.googleapis.com
  cloudkms.googleapis.com
  cloudresourcemanager.googleapis.com
  compute.googleapis.com
  iam.googleapis.com
  iamcredentials.googleapis.com
  logging.googleapis.com
  monitoring.googleapis.com
  run.googleapis.com
  secretmanager.googleapis.com
  servicenetworking.googleapis.com
  sqladmin.googleapis.com
  storage.googleapis.com
  sts.googleapis.com
)
gcloud services enable "${APIS[@]}"

echo "==> Creating state bucket gs://$STATE_BUCKET (if missing)"
if gcloud storage buckets describe "gs://$STATE_BUCKET" >/dev/null 2>&1; then
  echo "    bucket already exists, leaving as-is"
else
  gcloud storage buckets create "gs://$STATE_BUCKET" \
    --project "$PROJECT_ID" \
    --location "$REGION" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

echo "==> Enabling object versioning on state bucket"
gcloud storage buckets update "gs://$STATE_BUCKET" --versioning

cat <<EOF

==> bootstrap complete
State bucket : gs://$STATE_BUCKET
Region       : $REGION

Next steps:
  cd envs/<env>
  cp backend.hcl.example backend.hcl     # then set bucket=$STATE_BUCKET
  cp terraform.tfvars.example terraform.tfvars
  terraform init -backend-config=backend.hcl
  terraform plan
EOF
