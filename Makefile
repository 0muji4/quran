.PHONY: help install lint test go-test go-test-integration go-test-all go-test-coverage-check test-coverage-all ci-test bff-test bff-test-coverage migrate-lint db-migrate db-migrate-down db-migrate-version db-reset db-status db-shell minio-cors worker-py-test format-check format go-fmt go-fmt-check build ci dev-up dev-down dev-logs observability-up observability-down observability-logs observability-status

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install all dependencies
	pnpm install

build: ## Build all packages
	pnpm build

lint: ## Run linters for all packages
	pnpm lint

format-check: ## Check code formatting
	pnpm format:check

format: ## Format all code
	pnpm --filter @quran-project/eslint-config exec prettier --write .

test: ## Run all JS/TS tests
	pnpm test
	$(MAKE) worker-py-test

go-test: ## Run Go tests for all modules
	@echo "Running Go tests..."
	@go test ./apps/backend/... ./apps/worker/go/... ./packages/go-pkg/...

go-fmt: ## Format Go code
	@echo "Formatting Go code..."
	@gofmt -w $$(find ./apps/backend ./apps/worker/go ./packages/go-pkg -name '*.go' -not -path "*/vendor/*")
	@echo "✓ Go code formatted"

go-fmt-check: ## Check Go code formatting
	@echo "Checking Go code formatting..."
	@unformatted=$$(gofmt -l $$(find ./apps/backend ./apps/worker/go ./packages/go-pkg -name '*.go' -not -path "*/vendor/*")); \
	if [ -n "$$unformatted" ]; then \
		echo "gofmt needed on:"; \
		echo "$$unformatted"; \
		exit 1; \
	else \
		echo "✓ All Go files are properly formatted"; \
	fi

ci: format-check lint test build go-fmt-check go-test ## Run all CI checks locally
	@echo ""
	@echo "✓ All CI checks passed!"

bff-test:
	@echo "Running BFF tests..."
	@pnpm --filter @quran-project/bff test

bff-test-coverage:
	@echo "Running BFF tests with coverage..."
	@pnpm --filter @quran-project/bff test --coverage

worker-py-test:
	@echo "Running Python worker tests..."
	@if [ ! -d "apps/worker/python/.venv" ]; then \
		echo "Creating Python virtual environment..."; \
		python3 -m venv apps/worker/python/.venv; \
	fi
	@echo "Installing dependencies into virtual environment..."
	@apps/worker/python/.venv/bin/python -m pip install -r apps/worker/python/requirements-dev.txt
	@echo "Running tests using virtual environment..."
	@DISABLE_TELEMETRY=true apps/worker/python/.venv/bin/python -m pytest apps/worker/python/tests/

go-test-integration:
	@echo "Running Go integration tests..."
	@echo "This will start Docker containers for PostgreSQL and Redis"
	@go test -tags=integration -v ./packages/go-pkg/db/... ./packages/go-pkg/queue/... ./apps/backend/internal/repo/... ./apps/backend/internal/storage/...

go-test-all:
	@echo "Running all Go tests (unit + integration)..."
	@go test -short ./...
	@go test -tags=integration -v ./packages/go-pkg/db/... ./packages/go-pkg/queue/... ./apps/backend/internal/repo/... ./apps/backend/internal/storage/...

go-test-coverage-check: ## Run Go tests with coverage check (80% threshold)
	@echo "Running Go tests with coverage check..."
	@go test -tags=integration -coverprofile=coverage.out -covermode=atomic ./apps/backend/... ./packages/go-pkg/...
	@./scripts/check-go-coverage.sh coverage.out 80.0

test-coverage-all: go-test-coverage-check ## Run all tests with coverage (Go + TypeScript)
	@echo "Running TypeScript tests with coverage..."
	@pnpm run test:coverage

ci-test: go-test-coverage-check ## Run CI tests with coverage
	@pnpm run test:coverage
	@pnpm run test:e2e

migrate-lint: ## Validate migration filenames and up/down pairs
	@scripts/migrate-lint.sh db/migrations

db-migrate: ## Apply pending database migrations via golang-migrate
	@echo "Running database migrations..."
	@docker compose -f ops/docker/compose.dev.yml run --rm migrate up
	@echo "All migrations applied successfully!"

db-migrate-down: ## Roll back the most recent migration (LOCAL DEV ONLY; see ADR 0012)
	@echo "Rolling back ONE migration..."
	@docker compose -f ops/docker/compose.dev.yml run --rm migrate down 1

db-migrate-version: ## Show the currently applied migration version
	@docker compose -f ops/docker/compose.dev.yml run --rm migrate version

db-seed:
	@echo "Seeding database with initial data..."
	@echo "  Applying db/seed_quran.sql (reference Surah/Ayah data)..."
	@docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d app -v ON_ERROR_STOP=1 < db/seed_quran.sql > /dev/null
	@echo "  Applying db/seed.sql (demo fixtures)..."
	@docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d app -v ON_ERROR_STOP=1 < db/seed.sql > /dev/null
	@echo "Database seeded successfully!"

db-reset:
	@echo "Resetting database..."
	@docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d postgres -c "DROP DATABASE IF EXISTS app;"
	@docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d postgres -c "CREATE DATABASE app;"
	@echo "Database reset complete. Running migrations..."
	@$(MAKE) db-migrate

db-status:
	@echo "Current database tables:"
	@docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d app -c "\dt"

db-shell:
	@docker exec -it $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
		psql -U app -d app

minio-cors:
	@echo "Setting MinIO CORS configuration..."
	@docker run --rm --network $$(docker compose -f ops/docker/compose.dev.yml ps | head -2 | tail -1 | awk '{print $$NF}' | sed 's/_.*//') \
		-v $$(pwd)/ops/docker/minio-cors.json:/tmp/cors.json \
		minio/mc:latest \
		sh -c " \
			mc alias set local http://minio:9000 minio minio123 && \
			mc anonymous set download local/quran-alignments/uploads && \
			echo 'CORS setup complete (note: mc does not support CORS directly, BFF will handle it)' \
		"

## Development Environment

dev-up: ## Start all development services (infra + observability + apps)
	@echo "Starting development environment..."
	docker compose -f ops/docker/compose.dev.yml up -d
	@echo ""
	@echo "✓ Development environment started!"
	@echo ""
	@echo "Services:"
	@echo "  Web:         http://localhost:3000"
	@echo "  BFF:         http://localhost:4000"
	@echo "  Backend:     http://localhost:8080"
	@echo "  Postgres:    localhost:5432"
	@echo "  Redis:       localhost:6379"
	@echo "  MinIO:       http://localhost:9001 (admin/admin)"
	@echo ""
	@echo "Observability:"
	@echo "  Jaeger:      http://localhost:16686"
	@echo "  Prometheus:  http://localhost:9090"
	@echo "  Grafana:     http://localhost:3200 (admin/admin)"
	@echo ""

dev-down: ## Stop all development services
	@echo "Stopping development environment..."
	docker compose -f ops/docker/compose.dev.yml down
	@echo "✓ Development environment stopped!"

dev-logs: ## Show logs from all development services
	docker compose -f ops/docker/compose.dev.yml logs -f

## Observability Stack

observability-up: ## Start observability stack (OTEL, Jaeger, Prometheus, Loki, Grafana)
	@echo "Starting observability stack..."
	docker compose -f ops/docker/compose.dev.yml up -d otel-collector jaeger prometheus loki grafana
	@echo ""
	@echo "✓ Observability stack started!"
	@echo ""
	@echo "UIs available at:"
	@echo "  Jaeger:      http://localhost:16686 - Distributed tracing"
	@echo "  Prometheus:  http://localhost:9090 - Metrics & alerts"
	@echo "  Grafana:     http://localhost:3200 - Unified dashboards (admin/admin)"
	@echo ""
	@echo "OTEL Collector endpoints:"
	@echo "  OTLP HTTP:   http://localhost:4318"
	@echo "  Metrics:     http://localhost:8888/metrics"
	@echo ""

observability-down: ## Stop observability stack
	@echo "Stopping observability stack..."
	docker compose -f ops/docker/compose.dev.yml stop otel-collector jaeger prometheus loki grafana
	@echo "✓ Observability stack stopped!"

observability-logs: ## Show logs from observability services
	docker compose -f ops/docker/compose.dev.yml logs -f otel-collector jaeger prometheus loki grafana

observability-status: ## Check status of observability services
	@echo "=== Observability Stack Status ==="
	@docker compose -f ops/docker/compose.dev.yml ps otel-collector jaeger prometheus loki grafana
	@echo ""
	@echo "=== Endpoint Health Checks ==="
	@printf "%-20s " "Jaeger UI:"
	@curl -s -o /dev/null -w '%{http_code}\n' http://localhost:16686/ || echo "DOWN"
	@printf "%-20s " "Prometheus:"
	@curl -s -o /dev/null -w '%{http_code}\n' http://localhost:9090/-/ready || echo "DOWN"
	@printf "%-20s " "Loki:"
	@curl -s http://localhost:3100/ready 2>/dev/null || echo "DOWN"
	@printf "%-20s " "Grafana:"
	@curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3200/api/health || echo "DOWN"
	@printf "%-20s " "OTEL Collector:"
	@curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8888/metrics || echo "DOWN"
