resource "google_iam_workload_identity_pool" "this" {
  project                   = var.project_id
  workload_identity_pool_id = var.pool_id
  display_name              = var.pool_display_name
  description               = "Federation for ${var.github_repository}"
}

locals {
  branch_filter = length(var.allowed_branches) == 0 ? "" : format(
    "assertion.ref in [%s]",
    join(", ", [for b in var.allowed_branches : "'refs/heads/${b}'"])
  )

  env_filter = length(var.allowed_environments) == 0 ? "" : format(
    "assertion.environment in [%s]",
    join(", ", [for e in var.allowed_environments : "'${e}'"])
  )

  filter_clauses = compact([
    "assertion.repository == '${var.github_repository}'",
    local.branch_filter,
    local.env_filter,
  ])

  attribute_condition = join(" && ", local.filter_clauses)
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.this.workload_identity_pool_id
  workload_identity_pool_provider_id = var.provider_id
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"        = "assertion.sub"
    "attribute.repository"  = "assertion.repository"
    "attribute.ref"         = "assertion.ref"
    "attribute.environment" = "assertion.environment"
  }

  attribute_condition = local.attribute_condition

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Allow the GitHub OIDC principal set (scoped to the repo) to impersonate
# each app service account. The pool's principalSet binding is the
# canonical pattern for WIF (no long-lived JSON keys).
resource "google_service_account_iam_member" "impersonators" {
  for_each = toset(var.service_accounts)

  service_account_id = "projects/${var.project_id}/serviceAccounts/${each.value}"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.this.name}/attribute.repository/${var.github_repository}"
}
