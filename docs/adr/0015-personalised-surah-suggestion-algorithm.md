# ADR 0015: Personalised "what to practice next" + difficulty hints

- Status: Accepted
- Date: 2026-05-12
- Author: motoshi.suzuki
- Tracks: Phase 3.3 in `docs/web-tilawah-followups.md`

## Context

The Library page on `/` renders two pieces of personalised UI:

- The **Suggested for you** card (`apps/web/app/library/SuggestedCard.tsx`).
- The **difficulty pill** ("Easy / Medium / Hard") on every Surah row and on the Suggested card.

Both have been backed by placeholder logic in `apps/web/app/lib/classify.ts` since the Tilawah redesign (PR #87):

- `pickSuggestion` deterministically falls back to Al-Ikhlas (id `112`), filtered only by "not the surah the user is currently continuing".
- `difficultyOf` is a `ayahCount`-only heuristic (`<=10 → Easy`, `<=30 → Medium`, else `Hard`) — it has no relation to how the user actually performs.

ADR 0011 landed the BFF-side persistence the Web layer needs: `best_scores` (per-ayah best score) and `practice_attempts` (per-attempt history). With that data on the server side, the placeholder logic can now be replaced with a real per-user signal.

## Decision

**Move the Suggested-card selection and difficulty bucketing to the BFF behind a single `GET /me/suggestions` endpoint. The Web client's `classify.ts` becomes a thin adapter that displays whatever the BFF returns, with a fallback to the current `ayahCount` heuristic when the user is unauthenticated or the BFF call fails.**

### API shape

```
GET /me/suggestions  (requires auth; consistent with the rest of /me/*)

200 OK
{
  "suggested": {
    "surahId": "103",
    "reason": "short_unpracticed" | "short_low_score" | "fallback"
  },
  "difficulties": {
    "1": "easy",
    "2": "hard"
  }
}
```

- `difficulties` is **sparse** — only surahs the user has a `best_scores` row for are included. The Web client falls back to the existing `ayahCount` heuristic for unknown surahs, so the response stays small even though there are 114 surahs.
- `reason` is recorded but not surfaced in the UI today. It is exposed so that future telemetry (Phase 4.4) can attribute Suggested-card clicks to the selection branch that produced them without re-running the logic at read time.

### Selection algorithm

Implemented as a pure function `composeSuggestion(inputs)` in `apps/bff/src/me/suggestions.ts`. The DB layer fetches three tables in parallel:

- `best_scores` grouped by `surah_id` → `{ surahId, avgScore }`
- `practice_attempts` grouped by `surah_id` → `{ surahId, latestAt }`
- `surahs WHERE revelation_place = 'Mecca' AND ayah_count <= 10` → candidate pool

Branching, in order:

1. **Unpracticed short Meccan surahs** — pick the lowest-numeric `surahId`. Reason `short_unpracticed`.
2. **Lapsed short Meccan surahs** (last attempt before the recent-window cutoff) — pick the one with the lowest avg best-score; ties broken by numeric `surahId`. Reason `short_low_score`.
3. **Fallback** to Al-Ikhlas (`112`). Reason `fallback`.

Difficulty bucketing of the `best_scores` averages:

- `>= 85` → `easy`
- `60 .. 84` → `medium`
- `< 60` → `hard`

Thresholds are exported as named constants (`EASY_AVG_THRESHOLD`, `MEDIUM_AVG_THRESHOLD`, `RECENT_ATTEMPT_WINDOW_DAYS`, `FALLBACK_SURAH_ID`) so they are visible to anyone reading the file and trivial to tune later. They are intentionally **not** environment variables — that would obscure the calibration and make tests harder to read.

### Why a pure function + a wrapper

The DB query and the composition logic are split so the branching can be exercised with plain unit tests (no Postgres). The route handler in `routes.ts` only knows about `getSuggestion(userId)`, which itself only knows about the three fetcher helpers. The composition rules are the part most likely to evolve as we gather usage data, and keeping them pure means the tests stay cheap when that happens.

### Why Mecca-only + ayah_count <= 10

The Suggested card's stated value-prop in PR #87 is "a quick warm-up before longer practice". Mecca-revealed short surahs are uniformly short and familiar (Al-Ikhlas, Al-Falaq, An-Nas, the late juz' 30 pieces). Filtering at the SQL layer means we never ship a "suggested" pointing at a 286-ayah surah. The filter is a candidate-pool filter, not a hard recommendation rule — once we have signal that a different shape works, we widen it.

### Why a sparse `difficulties` map

A dense map of all 114 surahs would mean the response is ~3 KB even for a brand-new user with no scores; ~95% of those entries would be `undefined`-equivalent (no data) and we'd need a sentinel to communicate that. Sending only the surahs the user has scored, and falling back on the Web side, keeps the response small and the "no data" case obvious.

## Consequences

### Positive

- The Suggested card stops always pointing at Al-Ikhlas. New users see the canonical short surahs in order; returning users see the surah they are weakest on once they have scores.
- The difficulty pill stops lying. A user who has scored 95 on Al-Fatihah no longer sees it labelled "Easy" because it is short — it is labelled "Easy" because *they* find it easy.
- Web's `lib/classify.ts` shrinks to a display adapter, which is the right shape for a future i18n pass (ADR will follow for Phase 4.1).
- `reason` plumbing is ready for Phase 4.4 telemetry without further BFF changes.

### Negative

- One more endpoint on the `/me/*` surface to keep in sync with auth / DB migrations.
- The Mecca-only + short filter is opinionated; if usage data later contradicts it, the change is a one-liner in the SQL but it still requires a follow-up PR.
- Thresholds (85 / 60 / 7-day window) are placeholders driven by manual testing, not data. They should be revisited after Phase 4.4 telemetry produces a real distribution.

### Reconsideration triggers

Reopen this ADR when any of the following lands:

- Phase 4.4 telemetry shows >20% of Suggested clicks bouncing back to Library without starting recording → the candidate pool or ranking is off.
- A non-trivial cohort of users hits "lapsed" branch within their first 5 minutes (would imply the 7-day window is too short for early-funnel users).
- Internationalisation (Phase 4.1) requires the BFF to know the user's locale to surface culturally relevant short surahs — at that point the API shape may need a locale parameter.
