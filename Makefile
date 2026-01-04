.PHONY: help install lint test go-test go-test-integration go-test-all bff-test bff-test-coverage sql-migrate-dry-run db-migrate db-reset db-status db-shell minio-cors worker-py-test format-check format go-fmt go-fmt-check build ci

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
	@go test -tags=integration -v ./packages/go-pkg/db/... ./packages/go-pkg/queue/... ./apps/backend/internal/repo/...

go-test-all:
	@echo "Running all Go tests (unit + integration)..."
	@go test -short ./...
	@go test -tags=integration -v ./packages/go-pkg/db/... ./packages/go-pkg/queue/... ./apps/backend/internal/repo/...

sql-migrate-dry-run:
	if [ -f dbconfig.yml ]; then \
		sql-migrate up -config=dbconfig.yml -env=development -dryrun; \
	else \
		echo "dbconfig.yml not found; skipping sql-migrate dry-run"; \
	fi

db-migrate:
	@echo "Running database migrations..."
	@for file in db/migrations/*.sql; do \
		echo "Applying $$file..."; \
		docker exec -i $$(docker compose -f ops/docker/compose.dev.yml ps -q postgres) \
			psql -U app -d app < "$$file"; \
	done
	@echo "All migrations applied successfully!"

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
