.PHONY: install lint test go-test sql-migrate-dry-run db-migrate db-reset db-status db-shell

install:
	pnpm install

lint:
	pnpm lint

test:
	pnpm test

go-test:
	go test ./...

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
