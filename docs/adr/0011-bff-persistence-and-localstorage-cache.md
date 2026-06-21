# ADR 0011: BFF persistence for last-practiced / best-scores / attempts, with localStorage as read-only cache

- Status: Accepted
- Date: 2026-05-10
- Author: motoshi.suzuki

## Context

The Tilawah web app stores three pieces of per-user state in `localStorage` under the `tilawah:*` namespace, all funnelled through `apps/web/app/lib/storage.ts`:

- `tilawah:last-practiced` — single `LastPracticed` record (most-recent surah/ayah)
- `tilawah:best-scores` — `Record<"surahId:ayahNumber", BestScoreEntry>`
- `tilawah:recent-attempts` — `{ attempts: Attempt[] }` capped at 50

This works on a single browser but evaporates when the user clears storage, switches browser, or opens incognito. Phase 3.1 of `docs/web-tilawah-followups.md` calls for these to live on the BFF and follow the user across devices, with `localStorage` retained as a fast-paint cache.

Audit findings (full detail in the planning conversation):

- BFF: Express, zod-validated handlers, JWT scaffold via `requireAuth(req, res)`. `MOCK_SESSION=true` returns `{ id: 'mock-user', ... }` so an endpoint requiring `userId` works in dev / CI without ADR 0010 yet landing.
- DB: `users` (UUID PK), `attempts` (UUID PK, FK `user_id` → users, cascading delete) already exist. `attempts` already encodes the per-attempt rows we need.
- Web call sites: 9 storage.ts functions consumed across 7 components (SurahGrid, ContinueCard, SuggestedCard, HistoryList, RecorderPanel, SideStats, SuggestedCard). `SurahGrid` does **render-time synchronous reads** — the highest-friction migration site. `useLocalStorageState` is a synchronous-reader-only hook today.

## Decision

**Move the source of truth to the BFF behind `/me/*` endpoints. Keep `localStorage` as a read-only cache for fast first paint and offline tolerance. On first sign-in, one-shot upload of any pre-existing `localStorage` data to the BFF so user state is preserved across the auth transition.**

### Tables

Three new tables. The existing `attempts` table is intentionally NOT reused — see "Why a new `practice_attempts` instead of reusing `attempts`" below.

```sql
CREATE TABLE last_practiced (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  surah_id TEXT NOT NULL,
  ayah_number SMALLINT NOT NULL,
  surah_name_en TEXT NOT NULL,
  surah_name_ar TEXT NOT NULL,
  ayah_count SMALLINT NOT NULL,
  practiced_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE best_scores (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_id TEXT NOT NULL,
  ayah_number SMALLINT NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  achieved_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, surah_id, ayah_number)
);

CREATE TABLE practice_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  surah_id TEXT NOT NULL,
  surah_name_en TEXT NOT NULL,
  ayah_number SMALLINT NOT NULL,
  score SMALLINT CHECK (score IS NULL OR (score BETWEEN 0 AND 100)),
  job_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('COMPLETED', 'FAILED')),
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_practice_attempts_user_created_at
  ON practice_attempts (user_id, created_at DESC);
```

**Why a new `practice_attempts` instead of reusing `attempts`:** the existing `attempts` table belongs to the backend ASR pipeline and stores `transcript`, `evaluation JSONB`, `ayah_id` (FK to `ayahs.id`), and is RANGE-partitioned by `created_at`. The Web's per-attempt history shape is different — denormalised `surah_name_en` for offline display, `job_id` text reference, `status`, `duration_ms`. Stashing those into the existing `attempts.evaluation` JSONB would couple two unrelated lifecycles (the backend writes from the worker, the BFF would write from the Web client) and force every Web history read to JSONB-unwrap and JOIN `surahs`. A second purpose-built table is the cleaner separation.

### Endpoints

| Verb | Path                    | Body                    | Response                                       |
| ---- | ----------------------- | ----------------------- | ---------------------------------------------- |
| GET  | `/me/last-practiced`    | —                       | `LastPracticed \| null`                        |
| PUT  | `/me/last-practiced`    | `LastPracticed`         | `LastPracticed` (echoed)                       |
| GET  | `/me/best-scores`       | —                       | `Record<"surahId:ayahNumber", BestScoreEntry>` |
| PUT  | `/me/best-scores/:key`  | `{ score, achievedAt }` | `BestScoreEntry`                               |
| GET  | `/me/attempts?limit=50` | —                       | `{ attempts: Attempt[] }`                      |
| POST | `/me/attempts`          | `Attempt`               | `Attempt` (echoed)                             |

All endpoints `requireAuth(req, res)` — same scaffold as existing routes. Validation via zod. Storage layer talks raw `pg.Pool` (consistent with `apps/bff/src/infra/storage.ts`).

### Web client

`apps/web/app/lib/storage.ts` becomes an **async** wrapper. Each function:

1. Reads `localStorage` first (sync) and returns the cached value.
2. Kicks off a Server Action call to refresh the value asynchronously.
3. The Server Action writes the fresh value back into `localStorage`.

This is the SWR pattern, hand-rolled. It removes the render-time sync friction in `SurahGrid` because the cached value is still synchronously available — only updates are async. `useLocalStorageState` evolves to subscribe to the cache and re-render when the async refresh completes.

For the **write** path (`recordAttempt`, `recordBestScore`, `setLastPracticed`), the storage layer:

1. Updates `localStorage` immediately for instant UI feedback.
2. Fires the BFF write asynchronously. On failure, no rollback in v1 — the next read from BFF will reconcile.

### Migration

When a user first signs in (the moment `mock-user` flips to a real `userId`), the web client:

1. Reads all three `tilawah:*` keys.
2. POSTs the data through Server Actions: bulk PUT `/me/last-practiced`, foreach PUT `/me/best-scores/:key`, foreach POST `/me/attempts`.
3. On success, sets a `tilawah:migrated-to-bff` sentinel so the migration runs at most once per user per browser.

The data volumes are tiny (≤ 1 last-practiced, ≤ 114 surahs × O(10) best-scores = a few hundred rows max, ≤ 50 attempts). A single batch is fine.

## Rationale

- **Doc § 3.1 prescribes the cache pattern** verbatim ("localStorage は読み取り専用キャッシュとして残す...初回 paint と低速ネットワーク時の体験を維持する"). This ADR formalises that.
- **Reuse existing `attempts` table** rather than introducing `attempts_history`: the row shape already matches, the FK to `users` is in place, and querying `WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50` is a one-line repo function. New tables only where the data model genuinely differs.
- **Render-time sync reads stay sync.** The biggest fragility in this migration is `SurahGrid` and the `useLocalStorageState` hook. Cache-first means the existing render path keeps working; the async refresh is a separate code path.
- **Mock-session friendly.** Every `/me/*` endpoint reads `session.id` from the existing middleware, which works under both `MOCK_SESSION=true` (dev / CI) and a real ADR 0010 auth flow. Phase 3.1 can land independently of Phase 3.2.

## Consequences

Positive:

- User state follows the user across browsers / devices, satisfying the productisation prerequisite.
- First paint stays as fast as the cache version because reads are still synchronous.
- The migration path is one-shot and cheap; no long-running batch.
- Per-attempt rows now live in Postgres (where they were always meant to be), simplifying future analytics (KR2 — per-feature usage telemetry).

Negative:

- Two DB writes per practice attempt (one to `attempts`, one to `last_practiced` upsert). Postgres handles this fine; just noting the doubled round-trip.
- Cache divergence is possible if two tabs write concurrently; the deterministic resolver is "last writer to BFF wins, next read updates the cache". Acceptable for v1.
- `useLocalStorageState` evolves to support async refresh — a small hook rewrite that ripples to ContinueCard / SuggestedCard.

## Reconsideration Triggers

Re-open this decision when **any** of the following hold:

1. The cached / BFF dual-source pattern produces inconsistencies that users notice (e.g., scores disappearing on a new device because the migration sentinel got stuck). Move to BFF-only and accept the first-paint cost.
2. The data volume per user exceeds what fits in `localStorage` (~5 MB practical limit). Scope `localStorage` to "recent N items" and make the BFF the only source of truth for the rest.
3. Realtime collaboration (multi-device sync within a session) becomes a requirement. The current "last writer wins, eventual consistency" model is not enough.
4. The BFF moves to a CDN edge / serverless deployment where cold-start latency makes the async refresh painful. Consider write-back caching strategy.

## Alternatives Considered

- **BFF-only, no `localStorage` cache.** Rejected: forces every render to await an HTTP round-trip, kills the first-paint UX. The followup doc explicitly rejected this.
- **One-time migration on next visit, drop `localStorage` after.** Rejected: a returning user with a flaky network gets a blank page until the BFF responds. Cache-first solves both first-paint AND offline-read.
- **Merge `last_practiced` and `best_scores` into the existing `users.preferences JSONB`.** Rejected: per-attempt querying would force JSONB unwrapping, invalidates indexes, and ties row-shaped data to a settings column.
- **Use the existing `user_data_objects` table.** Rejected: that table is keyed by `session_id` and exists for tracking uploaded audio assets, not user state. Different lifecycle, different concerns.

## References

- `docs/web-tilawah-followups.md` §3.1 — verbatim spec for this ADR
- `apps/bff/src/infra/storage.ts` — existing pg.Pool storage layer pattern this PR will extend
- `apps/web/app/lib/storage.ts` — current localStorage layer to be wrapped
- `apps/web/app/hooks/useLocalStorageState.ts` — hook that needs an async-aware variant
- `db/migrations/20251202202600-Init.sql` — `users` and `attempts` table definitions
- ADR 0010 — auth source of `userId` consumed by every `/me/*` endpoint
