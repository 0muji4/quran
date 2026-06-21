# Observability Stack

OpenTelemetry Collector + Jaeger + Prometheus + Loki + Grafana, wired up via Docker Compose so that traces, metrics, and logs from web / bff / backend / worker land in one place.

> The configuration files themselves live under `ops/docker/` (`otel-collector-config.yaml`, `prometheus.yml`, `loki-config.yaml`, `grafana/`, ...). This README documents how to operate the stack.

## Bring it up / down

```bash
make observability-up       # start OTEL Collector + Jaeger + Prometheus + Loki + Grafana only
make observability-status   # health-check each UI / endpoint
make observability-logs     # tail observability logs
make observability-down     # stop the observability stack
```

`make dev-up` starts the full stack (apps + observability). Use `observability-up` when you want to attach observability to an already-running app stack.

## UIs

| UI         | URL                    | Purpose                                                                                                 |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| Jaeger     | http://localhost:16686 | Distributed tracing — follow a single request across Web → BFF → Backend → Worker via a shared trace ID |
| Prometheus | http://localhost:9090  | Metrics and time-series exploration                                                                     |
| Grafana    | http://localhost:3200  | Unified dashboards (`admin` / `admin`)                                                                  |

Pre-configured Grafana dashboards:

- Service Health Overview
- ASR Worker Performance
- Business Metrics

## OpenTelemetry endpoints

| Purpose                                  | URL                           |
| ---------------------------------------- | ----------------------------- |
| OTLP HTTP (send traces / metrics / logs) | http://localhost:4318         |
| OTLP gRPC                                | http://localhost:4317         |
| Collector self-metrics                   | http://localhost:8888/metrics |

Apps point at the collector via `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`. If you start an app without the collector running you will see `ECONNREFUSED ::1:4318` warnings; HTTP serving itself is unaffected.

## Architecture

```
Applications (Web / BFF / Backend / Worker)
             ↓ OTLP HTTP
       OpenTelemetry Collector
        ↓        ↓         ↓
     Jaeger  Prometheus  Loki
        ↓        ↓         ↓
          Grafana (Unified View)
```

## Capabilities

- **Distributed tracing**: follow a request from Web → BFF → Backend → Worker through one trace ID.
- **Metrics**: latency, error rate, custom business metrics collected by Prometheus.
- **Structured logging**: JSON logs with trace context auto-injected.
- **Correlation**: Grafana lets you pivot between logs, traces, and metrics by trace ID.
