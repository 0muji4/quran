# ADR 0021: Account-Required Multi-Device Practice History

- Status: Accepted
- Date: 2026-05-16
- Author: motoshi.suzuki

## Context

ADR 0007 (2026-05-09) deferred server-side practice history: iOS shipped against a local-first `UserDefaultsHistoryStore`, mirroring the web client's `localStorage` schema, with a `RemoteHistoryStore` seam reserved for future use. That ADR enumerated four reconsider triggers, the first being:

> Product decides multi-device history is required → migrate to a server-backed `HistoryStore`.

That trigger has now fired. Product has confirmed (2026-05-16) that "signing in syncs your practice history across devices" is a baseline account value — not an opt-in, not a future polish. At the same time, product has scoped history to **signed-in users only**: an anonymous user can still record and score an attempt, but nothing is persisted anywhere. This narrowing is a deliberate simplification, not a regression — anonymous-only history was never a load-bearing feature and removing it eliminates the entire anonymous → signed-in migration design that ADR 0007 implicitly punted on.

The infrastructure needed to deliver this is already in place from the iOS auth stack that landed in PR #285 (`TokenRefresher`), PR #286 (`AuthHTTPClient` + `HTTPMeClient`), and PR #287 (the `SuggestedCard` consumer that validated the transport). The BFF `/me/*` REST surface (`apps/bff/src/me/routes.ts`) already exists, having been built for the web client.

## Decision

1. **Practice history is a signed-in feature.** Anonymous users have no Continue card, no History tab data, no best-score tracking, and no last-practiced pointer. The Practice flow itself (record → upload → score → result) keeps working anonymously, but its output is not retained anywhere on the client or the server.
2. **Signed-in users are synced across devices** via the existing BFF `/me/*` REST surface. The BFF database is the source of truth. Clients keep a local cache for offline reads only; writes always go through the server.
3. **Per-record merge semantics** instead of blanket last-write-wins:
   - `practice_attempts`: union by `id`. The table is naturally append-only — concurrent attempts from two devices coexist in the timeline.
   - `best_scores`: `max(score)` per `(user_id, surah_id, ayah_number)`. Commutative and idempotent — order of arrival does not matter, and a stale "lower score" upload cannot clobber a current high.
   - `last_practiced`: last-write-wins by `practiced_at`. The only record whose semantics genuinely require LWW.
4. **The denormalised `last_practiced` table stays for now.** Issue #288 tracks its eventual removal once sync is observed stable in production.
5. **`SessionStore.signOut()` clears the local cache.** A signed-out device must not leak the previous user's history into the next sign-in.

## Rationale

- **Account = sync.** The whole point of taking the friction of signing up is that your records follow you. Anything weaker would erode the implicit product promise.
- **Append-only attempts mean no conflict resolution is needed for the most important record.** Users care about "did my practice today get recorded" far more than "did the most recent surah pointer reflect device B's latest tap". Append-only guarantees the answer is always yes.
- **`max(score)` is the obvious semantic for personal bests.** Naive PUT (the current `/me/best-scores/:key` handler) would let a stale low-score upload overwrite a current high-score during sync — that ships a regression to the user. Switching the handler to `MAX(EXCLUDED.score, best_scores.score)` is a one-line server change.
- **No anonymous → signed-in migration to design.** Anonymous data was never on the server, the client decides not to keep it locally, so there is nothing to move. This sidesteps the audio-and-scoring-result reassignment problem entirely.
- **All transport already exists.** `AuthHTTPClient` attaches Bearer + retries on 401 via `TokenRefresher`. A new `HTTPHistoryStore` is a thin REST client on top of it — no new auth, no new wire format, no new error vocabulary.

## Consequences

Positive:

- Simpler architecture: one HistoryStore implementation behind the protocol seam already provided by ADR 0007. ViewModels do not change.
- Anonymous flow is dead-simple: write nothing, read nothing, show "Sign in to track your practice" empty states.
- No bespoke migration code path → no migration code rot.
- The BFF schema stays as-is; only the `/me/best-scores/:key` handler needs a max-semantics change.

Negative:

- iOS users with existing UserDefaults history data have it discarded on the rollout. Acceptable because pre-rollout users were anonymous-only and we are explicitly telling them the feature requires sign-in going forward. No backfill path.
- Web users with existing `localStorage` data that has not yet been synced face the same discard. Mitigated by the fact that web has been syncing best-effort to BFF for signed-in users already; the discard primarily affects the anonymous local-only cache.
- Anonymous users lose the Continue card and the History tab data they may have seen during the local-first window. Acceptable per product framing.
- `/me/best-scores/:key` handler change must ship before iOS starts uploading scores, otherwise a brand-new client could clobber a current high score during the brief window.

## Alternatives Considered

- **Keep ADR 0007 unchanged: anonymous local + signed-in server.** Rejected: dual-mode code paths multiply forever, testing surface doubles, and the user mental model is muddier ("why did my history vanish when I made an account?").
- **Anonymous local + lazy migration to BFF on sign-in.** Rejected: the migration code becomes dead weight after run-once per user, and the audio + scoring-result data created under an anonymous session id has no equivalent server-side migration path. The product cost (a one-time goodwill gesture) does not justify the engineering cost (an open-ended migration surface).
- **iCloud Key-Value sync** (`NSUbiquitousKeyValueStore` on iOS, no equivalent on the others). Rejected: no Web parity, no Android parity, depends on Apple ID rather than the app's own identity, and conflicts with the BFF-as-source-of-truth model.
- **Blanket last-write-wins on all three records.** Rejected: a slow-network device replaying an old attempt batch would silently drop scores under blanket LWW. Per-record semantics close that hole at no design cost.
- **Drop `last_practiced` table now, derive from `practice_attempts`.** Rejected for this ADR: the same migration shipping with a schema change compounds risk. Tracked as issue #288 for after sync is stable.

## Reconsideration Triggers

Re-open when **any** of:

1. Anonymous practice grows into a substantial user segment with retention metrics that warrant tracking history for them. (Unlikely given the product positioning, but worth naming.)
2. Multi-device sync usage metrics show the cross-device case is negligible — at which point the local-only architecture from ADR 0007 may again be the simpler choice.
3. A regulatory regime (GDPR data minimisation, sector-specific compliance) forbids server-side persistence of practice data.
4. The merge semantics chosen here surface a user-visible bug that cannot be fixed without rethinking the model — e.g., an ordering anomaly the union/max/LWW scheme does not anticipate.

## References

- ADR 0007 — iOS local-first history persistence; the source of the `HistoryStore` protocol seam this design plugs into. Reconsider trigger #1 is the one this ADR responds to.
- ADR 0010 — email + password authentication; supplies the `user_id` the server-side records key off.
- ADR 0015 — personalised surah suggestion. Consumes `best_scores`; the `max` merge semantics matter here because a stale-low upload would distort suggestion difficulty estimates.
- Issue #288 — future removal of the denormalised `last_practiced` table.
- PR #285 / #286 / #287 — iOS auth and `AuthHTTPClient` infrastructure that this ADR builds on without modification.
- `db/migrations/20260510120000_practice_persistence.up.sql` — current schema, kept unchanged.
- `apps/bff/src/me/routes.ts` — `/me/*` REST endpoints that become the authoritative path.
- `apps/web/app/lib/storage.ts` / `apps/web/app/lib/storage-types.ts` — web's localStorage shape that has informed the wire format.
