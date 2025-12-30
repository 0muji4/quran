FROM golang:1.24 AS builder

WORKDIR /app

COPY go.work go.work.sum ./
COPY apps/backend ./apps/backend
COPY apps/worker ./apps/worker
COPY packages ./packages

ENV CGO_ENABLED=0

RUN cd apps/backend && go build -o /bin/backend ./cmd/server

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /bin/backend /bin/backend

EXPOSE 8080

CMD ["/bin/backend"]
