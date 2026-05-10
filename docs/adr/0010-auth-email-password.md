# ADR 0010: Email + Password authentication, Passkey-ready

- Status: Accepted
- Date: 2026-05-10
- Author: motoshi.suzuki

## Context

The Tilawah web app needs real authentication to enable Phase 3.1 (BFF persistence keyed on `userId`) and to retire the `MOCK_SESSION=true` fallback in production. The existing scaffolding consists of:

- `apps/bff/src/auth/auth.ts` — JWT verification middleware, supports `Authorization: Bearer <token>` headers AND `process.env.SESSION_COOKIE_NAME` cookies. Uses `jsonwebtoken` and reads `JWT_SECRET` / `REFRESH_TOKEN_SECRET`. `POST /auth/refresh` already exists.
- `db/migrations/20251202202600-Init.sql` — `users` table with UUID PK, `email CITEXT UNIQUE`, `display_name`, `preferences JSONB`. **No `password_hash` column. No signup / login handlers anywhere.**
- `MOCK_SESSION=true` returns `{id: 'mock-user', email: 'mock-user@example.com', displayName: 'Mock User'}` for non-prod.

The candidate methods considered (in roughly decreasing 2026 Big-Tech alignment):

| Method | Big-Tech use | MVP code cost | External deps |
| --- | --- | --- | --- |
| Email + Password | Universal primary at Apple, Google, Meta, Microsoft, Amazon, GitHub, X | ~150 LoC across signup / login / hash / verify | bcrypt only on login critical path |
| Passkey (WebAuthn) | Add-on layer at all of the above (post-2024) | ~250 LoC, browser API juggling | none |
| Sign in with Google / Apple | Common alternate, never primary | ~100 LoC + OAuth client config on each platform | Apple Developer Program required for iOS |
| Magic link | Common in B2B SaaS (Slack, Notion); rare in consumer Big Tech | ~80 LoC | Email delivery on login critical path (spam folders, latency) |
| Hosted SaaS (Clerk / Auth0 / Supabase Auth) | n/a | minimal | Vendor lock-in, monthly cost |

## Decision

**Email + Password as the primary authentication method, with the JWT and session layers structured so Passkey (WebAuthn) can be layered on later without rewriting the bearer/cookie path.**

Specifics:

- Add `password_hash TEXT NOT NULL` to the existing `users` table via a new DB migration. Use `bcrypt` (Node) on the BFF; cost factor 12 (≈ 250 ms hash).
- Issue a short-lived (15 min) access JWT via `Authorization: Bearer` and a long-lived (30 day) refresh JWT in an HttpOnly cookie. The existing `/auth/refresh` endpoint already implements the rotation flow.
- New BFF endpoints: `POST /auth/signup`, `POST /auth/login`. Both return `{ accessToken, user: { id, email, displayName } }` and set the refresh cookie.
- Web side: `/sign-in` and `/sign-up` route group with Server Actions that call the BFF endpoints. The access token lives in a Server-Action-managed Secure cookie so client JS cannot read it (XSS resilience).
- Defer "forgot password" to a follow-up PR. It needs an email-sending integration (Resend / Postmark / SES) which can plug in later without revisiting the core auth.
- Defer 2FA / Passkey enrolment. The schema leaves room: a future `webauthn_credentials` table linked to `user_id` adds Passkey as a parallel credential without changing the JWT layer.

## Rationale

- **Universal user experience.** Every Big Tech consumer app onboards new accounts with Email + Password. Users do not need to learn a new flow.
- **No external service on the login critical path.** Magic link makes email delivery a hard dependency for every login; password keeps it a soft dependency for the rarer reset flow. SLO posture is better.
- **Existing scaffolding fits.** The JWT verification middleware, cookie / bearer dual ingress, and `/auth/refresh` route are already wired. Adding signup / login is incremental.
- **Aligned with the project's "avoid unnecessary abstraction" principle (`~/.claude/CLAUDE.md`).** A standard form-based credential is the simpler primitive; magic link layers a token-in-URL exchange on top.
- **2026 password-manager landscape (iCloud Keychain, 1Password, Google PM) plus FaceID/TouchID autofill removes most of the historical "passwords are friction" critique on mobile.**
- **NIST SP 800-63B (latest revision) drops password-complexity rules in favour of length-only.** That removes the historical "rules are user-hostile" critique.

## Consequences

Positive:

- Login works without external services. Email service required only for password reset (a follow-up).
- Familiar UX; no education needed for new users.
- Passkey can be added as a parallel credential type without touching the JWT layer (leaves room for the trend).
- Pre-release scope: zero existing users to migrate; password breach response is theoretical until users exist.

Negative:

- ~150 LoC more than magic link (signup + login + hash + verify + reset path scaffolding).
- Once users exist, a DB breach requires a notification + forced reset cycle. Operational burden the team must own.
- The bcrypt cost factor must be tuned per CPU; 12 is a 2026 baseline but should be re-evaluated when traffic grows.
- "Forgot password" is a deferred surface that will need email infrastructure before public launch.

## Reconsideration Triggers

Re-open this decision when **any** of the following hold:

1. Passkey adoption reaches a point where the project wants WebAuthn as the *primary* method (not parallel). Schema and JWT layer already permit this.
2. A federated identity (Sign in with Apple / Google) becomes a compliance or distribution requirement (e.g., App Store rule changes mandating a federated option alongside email+password).
3. The team grows past one engineer and the "operate password reset / breach response" burden becomes a meaningful fraction of on-call time.
4. A regulatory change (GDPR, CCPA, sector-specific) imposes a stronger MFA requirement.

## Alternatives Considered

- **Magic link.** Rejected as primary: rare in consumer Big Tech, hard email-delivery dependency on the login critical path, additional UX education needed. Reasonable as a *secondary* path for users who do not want a password — could be added later if requested.
- **Sign in with Google / Apple.** Rejected as primary: requires OAuth client registration on web AND native (iOS), Apple variant needs Apple Developer Program enrolment. Good as a *secondary* path post-launch.
- **Clerk / Auth0 / Supabase Auth.** Rejected: vendor lock-in, monthly cost during pre-revenue, the verification logic itself is already half-built locally.
- **Email + Password without Passkey-ready architecture.** Rejected as a strict subset of this decision; the Passkey path is one schema migration away and ignoring it locks the team out of the dominant 2026 auth trend.

## References

- `apps/bff/src/auth/auth.ts` — existing JWT middleware
- `db/migrations/20251202202600-Init.sql` — current `users` schema
- `docs/web-tilawah-followups.md` §3.2 — Phase 3.2 carve-out
- ADR 0011 — BFF persistence layer that depends on `userId` produced by this auth flow
- NIST SP 800-63B — password length-only guidance
- Big-Tech survey (Apple ID, Google Account, Meta, Microsoft, GitHub, X): all use Email + Password as primary as of 2026-05
