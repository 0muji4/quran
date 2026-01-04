.PHONY: install lint test go-test go-test-integration go-test-all sql-migrate-dry-run db-migrate db-reset db-status db-shell minio-cors

install:
	pnpm install

lint:
	pnpm lint

test:
	pnpm test

go-test:
	@echo "Running Go unit tests..."
	@go test -short ./...

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
