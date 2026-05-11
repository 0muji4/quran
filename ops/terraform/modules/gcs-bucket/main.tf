resource "google_storage_bucket" "this" {
  project       = var.project_id
  name          = var.name
  location      = var.location
  storage_class = var.storage_class

  force_destroy               = var.force_destroy
  uniform_bucket_level_access = var.uniform_bucket_level_access

  versioning {
    enabled = var.versioning_enabled
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_age_days > 0 ? [var.lifecycle_age_days] : []
    content {
      action {
        type = "Delete"
      }
      condition {
        age = lifecycle_rule.value
      }
    }
  }

  dynamic "cors" {
    for_each = length(var.cors_origins) > 0 ? [var.cors_origins] : []
    content {
      origin          = cors.value
      method          = ["GET", "PUT", "POST", "DELETE", "HEAD"]
      response_header = ["Content-Type", "x-goog-meta-*"]
      max_age_seconds = 3600
    }
  }
}

resource "google_storage_hmac_key" "this" {
  count = var.hmac_service_account_email == null ? 0 : 1

  project               = var.project_id
  service_account_email = var.hmac_service_account_email
}
