# ADR 0025: gRPC Between the BFF and the Go Backend

- Status: Accepted
- Date: 2026-11-04
- Author: motoshi.suzuki
- Related: [ADR 0010](./0010-gcp-cloud-run-deployment.md), [ADR 0011](./0011-cloud-portability-principle.md), [ADR 0019](./0019-backend-inline-asr-supersedes-worker.md)

## Context

The project aims to align its stack with the technology Google uses internally. Backend (Go), Android (Kotlin) and Web / BFF (TypeScript) already use languages reported as officially supported at Google. The clearest remaining gap is service-to-service communication: Google's internal services communicate over Stubby with Protocol Buffers, while the BFF calls the Go backend over hand-written JSON REST.

Stubby is not available outside Google. gRPC is its public successor, and Protocol Buffers is the same format Google uses, so gRPC with Protocol Buffers is the closest available option.

The hand-written REST contract also has a practical cost. The BFF redeclares the backend's response types by hand, so a change on one side is not detected by the compiler on the other.

Two deployment constraints shape the decision:

- Cloud Run exposes one port per service, and needs that port set to `h2c` to carry gRPC end-to-end.
- The verification environment from ADR 0019 runs the backend behind Render's public HTTP proxy, where gRPC has not been verified.

## Decision

The BFF and the Go backend communicate over **gRPC with Protocol Buffers**. Client-facing protocols (GraphQL and REST on the BFF) do not change.

| Concern          | Choice                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Schema           | `schemas/proto/quran/v1`, linted by `buf`                                                               |
| Generated code   | Committed under `apps/backend/internal/gen` and `apps/bff/src/gen`; `make proto-check` fails on drift   |
| Server           | `grpc-go`, served from the existing port alongside REST and `/healthz`                                  |
| Transport        | Cleartext HTTP/2 (h2c) on the container port; `handler.Multiplex` routes on the `application/grpc` type |
| Client           | `@grpc/grpc-js` with `ts-proto` types                                                                   |
| Rollout switch   | `BACKEND_GRPC_ADDR` on the BFF; REST is used when it is unset                                           |
| Client transport | TLS by default, cleartext only with `BACKEND_GRPC_TLS=false`; keepalive every 60 seconds                |
| Interceptors     | Request logging and panic recovery on the backend                                                       |
| JSON documents   | `metadata`, `evaluation` and `segments` use `google.protobuf.Struct` / `ListValue`                      |
| Trace context    | Injected as gRPC metadata by the BFF, extracted by `otelgrpc` on the backend                            |
| Scoring timeout  | The BFF sets a 35-second deadline, above the backend's 30-second job timeout                            |

## Rationale

### 1. One port for gRPC and REST

Cloud Run's single port rules out a dedicated gRPC port. Sharing the port also lets REST and gRPC run side by side during the rollout, so one image serves both protocols.

`grpc.Server.ServeHTTP` makes this possible, at the cost of being an experimental API that lacks some features of the native transport. The traffic here is a small number of unary calls from one internal client, so those features are not needed.

gRPC handlers also run outside `net/http`'s per-request panic recovery and outside `middleware.OTEL`. Without replacements, one panic would stop the process and calls would leave no request log, so the backend adds its own interceptors for both.

### 2. A switch instead of a cutover

gRPC through Render's proxy is unverified, so an immediate cutover could break the only environment that has run the full scoring path. The REST client therefore stays until gRPC is proven on the target deployment, and unset `BACKEND_GRPC_ADDR` keeps existing environments unchanged.

### 3. Structured types with JSON documents left as JSON

`metadata`, `evaluation` and `segments` are stored as JSON and passed through by the BFF. Modelling them as typed messages would add a mapping layer with no consumer, so they stay as `Struct` / `ListValue`. Fixed fields such as the surah ID and the scoring status are typed.

### 4. Compatibility with ADR 0011

gRPC and Protocol Buffers are open, vendor-neutral standards with no cloud dependency. Moving the service to another cloud changes only the `h2c` port setting, so ADR 0011 is satisfied.

## Consequences

Positive:

- The compiler now detects contract changes on both sides of the BFF-to-backend boundary.
- gRPC status codes separate "not found" from infrastructure failure. `GetSurah` returns `NOT_FOUND` only for a missing row, whereas the REST handler returns 404 for every error.
- Calls from the BFF now have deadlines. The REST client has none, which ADR 0019's verification identified as a source of long hangs.

Negative:

- Both protocols must be maintained until REST is removed.
- Debugging needs gRPC-aware tooling, such as `grpcurl`, in place of `curl`.
- Generated code adds to the repository and needs the `proto-check` CI job.
- Backend gRPC calls bypass `middleware.OTEL`, so they are not counted in `http.server.*` metrics.

## Remaining Work

1. Add Cloud Run authentication: the backend is deployed with `allow_unauthenticated = false`, so the BFF must attach an ID token. The REST client has the same gap.
2. Set `BACKEND_GRPC_ADDR` on the target deployment and verify the full scoring path.
3. Remove the backend's REST routes and the BFF's REST client.

## Reconsideration Triggers

- Google publishes a supported replacement for `grpc.Server.ServeHTTP`, or it is removed.
- The backend gains clients that cannot speak gRPC, such as browsers calling it directly.
