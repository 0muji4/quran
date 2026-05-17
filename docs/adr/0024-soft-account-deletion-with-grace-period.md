## ADR 0024: Soft Account Deletion with 30-Day Grace Period

- Status: Accepted
- Date: 2026-05-17
- Author: motoshi.suzuki

## Context

The web profile page added in [ADR-0023 follow-up PR #330](https://github.com/0muji4/quran-project/pull/330) renders a "Delete account" button in the Sign out card. The button is currently disabled because the BFF has no deletion endpoint, and because the policy question — what does "delete" mean for a Tilawah account — was deliberately deferred until after the basic profile shipped.

The product context is:

- The data tied to a Tilawah account is sensitive in two different ways: **personally identifying** (email, display name) and **personally meaningful** (recitation audio attempts, streak history, best scores). The first kind argues for hard-and-fast erasure; the second argues for protecting the user from a single misclick.
- Streak / history loss is the most-cited "I was going to delete but then I tried it again" anxiety in habit-loop apps (Duolingo, Headspace, MyFitnessPal all gate streak destruction behind multi-step confirms for the same reason).
- The product has **no current regulated obligation** to provide instant deletion. There is no SOC 2 audit in flight; the only GDPR Art. 17 trigger today is a user request, which a 30-day fulfilment window satisfies (the regulation only requires "without undue delay").
- The team is one engineer; an irreversible production data destruction needs a recovery story.

The industry's converged answer for consumer apps in this position is a soft-delete + grace period, and we want to follow it.

## Decision

Account deletion is **soft** with a **30-day reactivation window** before the row is physically removed.

1. **Schema.** `users` gains a nullable `deleted_at TIMESTAMPTZ`. A non-null value flags a row as soft-deleted; a null value means the row is live. No new table. The reactivation token is implicit — anyone with the email + password can recover within the grace window.
2. **Issue path** (`DELETE /auth/me`, future PR):
   - Set `users.deleted_at = NOW()`.
   - Invalidate every issued refresh token for that user (`refresh_tokens.revoked_at = NOW()`) so other devices lose their session immediately.
   - Clear the caller's HttpOnly auth cookies in the response (Web) — the equivalent of `signOutAction` runs at the end of the deletion flow.
   - Return 204. The UI lands on the signed-out home and shows a "Your account is scheduled for deletion in 30 days. Sign back in any time before then to cancel."
3. **Read gating.** Every authenticated read (`findUserById`, `findUserByEmail`, `/auth/me`, etc.) treats `deleted_at IS NOT NULL` as "user not found." A signed-out deleted account behaves identically to a never-existed account; this prevents partial-state weirdness like seeing your name in a header for two seconds before the next request 401s.
4. **Sign-in reactivation.** A signed-out user who signs in with the email + password of a soft-deleted account **resurrects** the account: `UPDATE users SET deleted_at = NULL` and proceed with the normal sign-in flow. The UI surfaces a "Welcome back — your account has been restored" toast. This is the simplest possible reactivation UX and avoids a separate "recover" endpoint.
5. **Purge.** A purge job runs at most once per day and hard-deletes any `users` row with `deleted_at < NOW() - INTERVAL '30 days'`. Foreign keys (`attempts.user_id`, `refresh_tokens.user_id`, etc.) all have `ON DELETE CASCADE` already; verify this against the schema during the implementation PR and add explicit `ON DELETE CASCADE` to any FK that doesn't have one.
6. **Auditability.** The purge job logs the user id, the soft-delete timestamp, and the row count to OTel so support can answer "did this account actually get purged?" Soft delete itself logs via the existing BFF `logger.info` channel.
7. **Web UI.** The Delete account button opens a confirmation modal that **types-to-confirm** ("type DELETE to confirm") rather than a plain Yes/No, because the entire history / streak / audio set is at risk. The modal explains the 30-day window and that signing back in restores everything.
8. **iOS / Android.** The same flow is implemented on the mobile clients in a follow-up PR; the BFF API is the contract so the per-platform work is UI-only.

## Rationale

- **Why soft, not hard, by default.** A streak / audio history that took weeks to build is one tap away from destruction. The product gives the user 30 days to undo a misclick; the cost to the team is a small DB column and a single cron entry. The user-facing affordance ("type DELETE to confirm") is the *first* line of defence; the grace period is the *fallback* for when that line failed.
- **Why 30 days.** Big-tech precedent (Google: ~60d, GitHub: 90d, Twitter: 30d, Stripe: 90d for regulated reasons) clusters between 30 and 90. 30 is the shortest that still gives a reasonable "I changed my mind" window without hoarding stale data unnecessarily. We can extend later if support requests warrant it; shortening would feel like a retraction.
- **Why reactivate on sign-in rather than via a recovery link.** The sign-in flow is the only flow the deleted user has any incentive to come back through. Adding a separate "Recover deleted account" UI gives us two entry points to test and one more confusing message to write. Treating sign-in as the reactivation path keeps the surface area minimal.
- **Why CASCADE-by-default on the purge.** The alternative — keeping orphaned attempts after the user row vanishes — is technically possible but has no UX consumer (the User-Practice JOIN in History always filters by `user_id`, and nothing else does). The simplicity is worth more than the optionality.
- **Why a type-to-confirm modal.** A Yes/No dialog is dismissable by autopilot. Typing the word DELETE forces a moment of intentional action and is the standard for irreversible-feeling actions across consumer SaaS (GitHub repo delete, Stripe customer delete, Linear workspace delete).

## Consequences

Positive:

- Misclick recovery is free.
- GDPR Art. 17 obligation ("without undue delay") is met by the 30-day purge.
- A single audit-log line per deletion + per purge run.
- Mobile clients get the same flow once they consume the same BFF endpoint.
- Soft-delete state is a single bit; no parallel "deleted_users" table to keep in sync.

Negative:

- The `users` table grows monotonically until the purge runs. With Tilawah's current scale this is invisible; if accounts spike into the millions, the daily purge becomes a bigger transaction. Mitigated by partitioning the purge into batches if the daily count ever exceeds, say, 10k.
- A deleted user who *forgets* their password during the 30-day grace cannot recover (password reset is itself deferred to a future PR). Acceptable tradeoff for Phase 2; the password-reset flow lands separately and will need to recognise the soft-deleted state at that point.
- Email re-registration: a user who soft-deleted their account cannot sign up with the same email until the grace window expires (the `UNIQUE` constraint on `email` still applies). Surfacing this as "email already in use" is mildly confusing; the sign-up handler will need a small branch to say "this email was recently deleted — sign in to restore the account." Tracked in the implementation PR.

## Alternatives Considered

- **Hard delete only.** Simplest implementation; loses the misclick recovery and creates support tickets ("can you restore my account?") that we can't honour. Rejected.
- **Soft delete with no auto-purge.** Keep deleted rows forever, behind a `deleted_at` flag. Cleaner from a "we can always restore" perspective but creates indefinite PII retention, which is the *exact* thing GDPR Art. 17 prohibits. Rejected.
- **Recovery via emailed link.** A signed-in deleted user gets an email with a magic restore link. More secure against a leaked password mid-grace, but adds an external dependency (no email send infra exists today; see ADR-XXXX-pending). Rejected for Phase 2; reconsider once we have a transactional email pipeline.
- **Type-to-confirm "email-address" instead of "DELETE".** Considered as an even higher friction option (the user has to type their own email). Rejected for now: DELETE is enough friction for a streak-and-audio loss, and asking the user to type their email is awkward when the email is already shown in the modal context.
- **48-hour grace** (matches some mobile-first apps). Rejected: too short for a user who deletes on a Sunday and only thinks about it the next weekend.
- **90-day grace** (GitHub). Rejected as default: too long to be the user's first guess; we can always extend.

## Migration Plan

Sequential PRs after this ADR merges:

- **PR-E2 — Schema.** Add `users.deleted_at TIMESTAMPTZ`, verify / add `ON DELETE CASCADE` on FKs. Migration-only PR (per the team's "migration separately" convention).
- **PR-E3 — BFF read gating.** `findUserById` / `findUserByEmail` / `requireAuth` middleware treat `deleted_at IS NOT NULL` as "user not found". A live row remains live.
- **PR-E4 — BFF DELETE /auth/me.** Issue the soft-delete and invalidate refresh tokens. Tests cover the happy path, the cascade of read gating, and the cookie clearance.
- **PR-E5 — BFF sign-in reactivation.** `/auth/login` recognises the soft-deleted account and restores it on a correct password. Logs the reactivation.
- **PR-E6 — Web Delete account modal.** Type-to-confirm modal wired to `DELETE /auth/me`; on success the page redirects to the signed-out home with a reactivation hint.
- **PR-E7 — Sign-up branch for soft-deleted email.** `POST /auth/signup` for an email matching a soft-deleted row returns a hint to sign in instead.
- **PR-E8 — Purge job.** Daily cron (initially in the Go backend or as a separate worker) that hard-deletes rows older than the grace window. Logs counts to OTel.

Each step ships independently; the user-visible Delete button stays disabled until PR-E6 lands.

## Reconsideration Triggers

Re-open this ADR if:

- A regulated environment (HIPAA, FedRAMP, GDPR audit) imposes a shorter purge requirement.
- Email re-registration during the grace window turns into a meaningful support volume.
- Support starts receiving "I changed my mind on day 31" requests at a non-trivial rate (suggests 30 days is too short).
- A user-facing recovery link becomes available (transactional email pipeline lands), at which point we can offer a "restore without sign-in" affordance and rework Decision §4.
- The `users` table grows past 10M deleted-pending rows, at which point the purge job needs to be batched.

## References

- [ADR-0010](./0010-auth-email-password.md) — Auth, refresh tokens, sign-in flow this ADR extends.
- [ADR-0021](./0021-account-required-multi-device-history.md) — Practice history is account-scoped; soft-delete protects the same history.
- [PR #330](https://github.com/0muji4/quran-project/pull/330) — Web profile page where the Delete account button currently sits disabled.
- GitHub account deletion docs (90-day window).
- Twitter/X account deletion (30-day window).
