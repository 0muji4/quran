# Root backend stub. Each env initialises the GCS backend with its own
# bucket + prefix via `-backend-config=backend.hcl` so the same code can
# serve staging and prod without hard-coding values. Run bootstrap.sh
# once per project to create the state bucket before `terraform init`.
terraform {
  backend "gcs" {}
}
