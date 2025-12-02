.PHONY: install lint test go-test sql-migrate-dry-run

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
