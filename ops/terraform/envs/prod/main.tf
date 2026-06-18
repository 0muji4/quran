locals {
  env = "prod"

  apps = {
    backend = {
      image                 = var.container_images.backend
      container_port        = 8080
      cpu                   = "2"
      memory                = "1Gi"
      min_instances         = 1
      max_instances         = 20
      cpu_always_allocated  = false
      allow_unauthenticated = false
    }
    bff = {
      image                 = var.container_images.bff
      container_port        = 4000
      cpu                   = "2"
      memory                = "1Gi"
      min_instances         = 1
      max_instances         = 20
      cpu_always_allocated  = false
      allow_unauthenticated = false
    }
    web = {
      image                 = var.container_images.web
      container_port        = 3000
      cpu                   = "2"
      memory                = "1Gi"
      min_instances         = 1
      max_instances         = 30
      cpu_always_allocated  = false
      allow_unauthenticated = true
    }
  }
}

# --- Artifact Registry --------------------------------------------------------
module "artifact_registry" {
  source = "../../modules/artifact-registry"

  project_id    = var.project_id
  location      = var.region
  repository_id = "quran-${local.env}"
}

# --- Per-app service accounts -------------------------------------------------
module "sa_backend" {
  source = "../../modules/service-account"

  project_id   = var.project_id
  account_id   = "quran-${local.env}-backend"
  display_name = "Quran backend (${local.env})"
  roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
  ]
}

module "sa_bff" {
  source = "../../modules/service-account"

  project_id   = var.project_id
  account_id   = "quran-${local.env}-bff"
  display_name = "Quran BFF (${local.env})"
  roles = [
    "roles/cloudsql.client",
    "roles/secretmanager.secretAccessor",
    "roles/storage.objectAdmin",
  ]
}

module "sa_web" {
  source = "../../modules/service-account"

  project_id   = var.project_id
  account_id   = "quran-${local.env}-web"
  display_name = "Quran web (${local.env})"
  roles        = []
}

module "sa_otel" {
  source = "../../modules/service-account"

  project_id   = var.project_id
  account_id   = "quran-${local.env}-otel"
  display_name = "OTel collector (${local.env})"
  roles = [
    "roles/cloudtrace.agent",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}

# --- Secrets ------------------------------------------------------------------
module "db_password_secret" {
  source = "../../modules/secret"

  project_id = var.project_id
  secret_id  = var.db_password_secret_id
  accessors = [
    module.sa_backend.email,
    module.sa_bff.email,
  ]
}

# --- Cloud SQL ----------------------------------------------------------------
module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id                  = var.project_id
  region                      = var.region
  name                        = "quran-${local.env}"
  tier                        = "db-custom-2-7680"
  disk_size_gb                = 100
  deletion_protection         = true
  private_network             = var.vpc_network_self_link
  app_user_password_secret_id = module.db_password_secret.secret_id
}

# --- GCS bucket ---------------------------------------------------------------
module "audio_bucket" {
  source = "../../modules/gcs-bucket"

  project_id                 = var.project_id
  location                   = var.region
  name                       = "${var.project_id}-audio"
  versioning_enabled         = true
  lifecycle_age_days         = 0
  force_destroy              = false
  hmac_service_account_email = module.sa_bff.email
}

# --- OTel collector -----------------------------------------------------------
module "otel_collector" {
  source = "../../modules/otel-collector"

  project_id            = var.project_id
  region                = var.region
  service_account_email = module.sa_otel.email
  min_instances         = 1
  max_instances         = 10
}

# --- Cloud Run services -------------------------------------------------------
module "service" {
  source   = "../../modules/cloud-run-service"
  for_each = local.apps

  project_id            = var.project_id
  region                = var.region
  name                  = "quran-${local.env}-${each.key}"
  image                 = each.value.image
  container_port        = each.value.container_port
  cpu                   = each.value.cpu
  memory                = each.value.memory
  min_instances         = each.value.min_instances
  max_instances         = each.value.max_instances
  cpu_always_allocated  = each.value.cpu_always_allocated
  allow_unauthenticated = each.value.allow_unauthenticated
  service_account_email = {
    backend = module.sa_backend.email
    bff     = module.sa_bff.email
    web     = module.sa_web.email
  }[each.key]
}

# --- Workload Identity Federation (GHA → GCP) ---------------------------------
module "wif" {
  source = "../../modules/workload-identity-federation"

  project_id           = var.project_id
  pool_id              = "github-${local.env}"
  provider_id          = "github-${local.env}-provider"
  github_repository    = var.github_repository
  allowed_branches     = ["main"]
  allowed_environments = [local.env]
  service_accounts = [
    module.sa_backend.email,
    module.sa_bff.email,
    module.sa_web.email,
  ]
}
