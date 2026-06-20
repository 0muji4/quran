FROM golang:1.25 AS builder

WORKDIR /app

COPY go.work go.work.sum ./
COPY apps/backend ./apps/backend
COPY packages ./packages
# The `quran-project/db` module is workspace-listed (its embed FS feeds the
# integration test schema), so go.work resolution needs db/go.mod present.
# Copying the directory is small and keeps the build self-contained.
COPY db ./db

ENV CGO_ENABLED=0

RUN cd apps/backend \
    && go build -ldflags="-s -w" -o /bin/backend ./cmd/server \
    && go build -ldflags="-s -w" -o /bin/healthcheck ./cmd/healthcheck

# Distroless static gives us a glibc-free, shell-free, non-root runtime —
# only the two binaries above ride along. The `:nonroot` tag sets USER and
# GROUP to `nonroot` (uid 65532) automatically; we set it explicitly for
# clarity and to survive future tag changes.
FROM gcr.io/distroless/static:nonroot

WORKDIR /app

COPY --from=builder /bin/backend /bin/backend
COPY --from=builder /bin/healthcheck /bin/healthcheck

USER nonroot:nonroot

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD ["/bin/healthcheck"]

ENTRYPOINT ["/bin/backend"]
