# ADR 0007: iOS History Persistence — Local-First, Mirroring the Web Schema

- Status: Accepted
- Date: 2026-05-09
- Author: motoshi.suzuki

## Context

The History tab (`docs/design/iOS _ History.png`) and the Library tab's Continue card both require persisted records of past attempts: which surah and ayah were practised, the score, the timestamp, and the best score per ayah. The web app already implements this entirely client-side in `apps/web/app/lib/storage.ts` using `localStorage` under three keys (`tilawah:last-practiced`, `tilawah:best-scores`, `tilawah:recent-attempts`). The BFF and backend currently expose no `history` query and no `attempts` table — adding one would touch the schema, the backend, the BFF, the web app, and the Android app, and is out of scope for the iOS parity rebuild.

## Decision

iOS persists practice history locally via a `HistoryStore` protocol with a `UserDefaultsHistoryStore` implementation, **using the same JSON shape as the web app's `localStorage` schema**.

```swift
protocol HistoryStore {
  func lastPracticed() -> LastPracticed?
  func setLastPracticed(_ entry: LastPracticed)
  func bestScore(surahId: String, ayahNumber: Int) -> BestScoreEntry?
  func recordBestScore(surahId: String, ayahNumber: Int, score: Double)
  func recentAttempts(limit: Int) -> [Attempt]
  func recordAttempt(_ attempt: Attempt)
}

struct Attempt: Codable, Identifiable {
  let id: String
  let surahId: String
  let surahNameEn: String
  let ayahNumber: Int
  let score: Double?
  let jobId: String
  let createdAt: Date
  let status: AttemptStatus  // .completed | .failed
  let durationMs: Int?
}
```

`Attempt`, `LastPracticed`, and `BestScoreEntry` field names and JSON encoding mirror `apps/web/app/lib/storage.ts:7-29` exactly. UserDefaults keys mirror the web string keys.

A `InMemoryHistoryStore` is provided for tests and Previews.

## Rationale

- **Scope discipline.** Adding a server-side history surface requires schema design, migrations, BFF resolvers, web migration, and Android migration. None of that is on the iOS critical path.
- **Web parity, not divergence.** Mirroring the web JSON shape means future server-side history work can introduce one DTO that satisfies both clients with no per-platform mapping.
- **UserDefaults is the right size.** A history limit of 50 attempts × ~250 bytes each is well under the comfortable ceiling for `UserDefaults`. SwiftData / Core Data would import migration complexity and tooling friction for no functional gain.
- **Protocol seam preserves the migration path.** When the team chooses to invest in a server-backed history, `RemoteHistoryStore: HistoryStore` is a drop-in replacement. ViewModels do not change.
- **No multi-device sync — by design today.** The web app has the same constraint. Solving sync is a cross-platform initiative, tracked separately.

## Consequences

Positive:

- iOS ships History and Continue features without any BFF or schema change.
- Future server-side history is a HistoryStore implementation swap, not a ViewModel rewrite.
- Tests run with `InMemoryHistoryStore`; no UserDefaults pollution between tests.
- Schema parity with web simplifies future analytics and migration.

Negative:

- History does not survive app uninstall or move between devices. Acceptable until the product validates the history feature is worth server cost.
- Two clients (web, iOS) maintain duplicate persistence logic against the same schema. Drift risk is mitigated by writing the iOS DTO from the web source-of-truth file.
- 50-attempt cap is a product choice frozen at this layer; if product wants infinite history this layer needs reconsideration.

## Alternatives Considered

- **SwiftData (iOS 17) / Core Data.** Rejected: deployment target bump (SwiftData) or boilerplate burden (Core Data) for a 50-row store with no relational queries.
- **JSON file in `FileManager.default.urls(.documentDirectory)`.** Equivalent to UserDefaults at this scale but with more code and no benefit.
- **Add `attempts` query to GraphQL schema.** Out of scope for the iOS parity rebuild; logged as a future cross-platform initiative.
- **Sync via iCloud (`NSUbiquitousKeyValueStore`).** Rejected: introduces Apple-account dependency, breaks parity with web/Android, and conflicts with the "server-backed when we commit to it" trajectory.

## Reconsideration Triggers

Re-open when **any** of:

1. Product decides multi-device history is required → migrate to a server-backed `HistoryStore`.
2. Per-ayah analytics (e.g. mistake heatmaps) require server aggregation → server-side store becomes the source of truth.
3. The history record schema diverges meaningfully from web → align via a shared DTO in `packages/shared-ts` or its Swift equivalent.
4. Storage cap of 50 attempts becomes a user-visible constraint → introduce paging or move to a database.

## References

- `apps/web/app/lib/storage.ts:7-29` — canonical schema mirrored by iOS
- `docs/design/iOS _ History.png` — target History UI
- `docs/design/iOS _ Surah library.png` — Continue card consuming `lastPracticed`
- ADR 0006 — protocol-facade pattern that `HistoryStore` follows
