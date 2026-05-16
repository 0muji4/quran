# ADR 0023: Web Internationalization — Message Catalogs From Day One

- Status: Accepted
- Date: 2026-05-16
- Author: motoshi.suzuki

## Context

[ADR 0009](./0009-ios-internationalization-from-day-one.md) committed the iOS client to `LocalizedStringKey` and a two-bundle (`en.lproj` / `ar.lproj`) layout from the first rebuild PR forward. The web client, in contrast, ships zero localization infrastructure: every user-visible string in `apps/web/app/**` is an inline English literal — `<p>Already have an account?</p>`, `<button>Sign in</button>`, `'Please accept the Terms of Service…'` in form-action error throws, and so on. There is no `next-intl` / `react-intl` / `i18next` dependency in `apps/web/package.json`, no `messages/` directory, and no `next.config.mjs` locale routing.

This asymmetry is not merely cosmetic. The 2026-05-09 Update on ADR 0009 cites "Web is English-only and Android is unstarted" as one of three reasons to defer the iOS Arabic value pass:

> "Localizing iOS alone creates cross-platform divergence that has to be unwound later."

In other words, the web's missing i18n posture is currently a load-bearing reason for *not* localizing iOS values either. The product is paying the cost of having infrastructure on one platform and content stuck behind cross-platform parity on the other.

A May 2026 Web ↔ iOS feature audit (see `~/.claude/plans/audit-the-current-feature-dapper-puffin.md`, Cross-cutting #1) flagged this gap explicitly. Retrofitting i18n into a Next.js App Router codebase has the same cost shape as the SwiftUI retrofit ADR 0009 warned against: every Server Component, Client Component, and Server Action throw site has to be revisited.

## Decision

The web client adopts the iOS posture, projected onto the App Router stack:

1. **Every user-visible string is referenced via an i18n key.** In Server Components and Client Components alike: `t('auth.signup.title')`. In Server Actions: `throw new Error(t('error.terms.required'))` (or, preferably, the typed-error path discussed in §7 below).
2. **Two message catalogs ship from day one:** `apps/web/messages/en.json` (the source of truth) and `apps/web/messages/ar.json` (initially mirrors English; real Arabic values land in a follow-up PR — the same reconsideration triggers as ADR 0009 apply). This matches iOS bundle-for-bundle.
3. **`next-intl` is the library.** App Router-native, supports both Server and Client Components without an explicit provider boundary, and exports a `Locale` middleware for routing. No third-party translation-management dependency yet; XLIFF / Crowdin / etc. can be layered later without changing call sites.
4. **Arabic locale honours RTL.** The HTML `<html dir="rtl" lang="ar">` is driven by the active locale; ayah text continues to render RTL regardless of UI locale (consistent with the iOS rule in ADR 0009 §3).
5. **Typography pairs with locale.** Latin copy keeps the current SF Pro / system fallback; Arabic copy uses the Quran-subset Amiri stack already loaded for ayah rendering (see [ADR 0020](./0020-amiri-quran-subset.md)). No new font payload required for the infrastructure PR.
6. **Routing posture: locale prefix.** `/[locale]/...` with `en` as the default; root paths redirect to the default locale. This is reversible and avoids `Accept-Language` sniffing as the primary signal — an explicit URL locale is what shareable links need.
7. **Error vocabulary is a related concern, tracked separately.** Server Actions currently `throw new Error(message)` with inline English strings (audit Cross-cutting #2). A future ADR will introduce a typed `AppError`-equivalent on Web (mirroring iOS's `App/AppError.swift`) whose `errorDescription` / `recoverySuggestion` are sourced from the same message catalogs. This ADR does not block on that work, but the migration order below assumes the two efforts land in parallel: do not invest in inline-English error literals during the i18n migration that the typed-error PR will then re-touch.

## Rationale

- **Retrofitting i18n is the most-frequently-cited "we should have done this earlier" decision** — ADR 0009's headline rationale applies identically to App Router codebases. The marginal cost of `t('key')` over a literal is zero at write time and saves a full-tree pass later.
- **Symmetry with iOS unblocks the Arabic value pass.** Once both platforms have the bundles in place, a translator engagement is a values-only PR on both sides simultaneously, eliminating the "iOS alone diverges" objection ADR 0009 captured in its Update.
- **`next-intl` is App Router-native.** Server Components can call `getTranslations` synchronously; Client Components use a hook. No `'use client'` boundary has to move just to access strings.
- **Locale-prefixed routing is honest about which locale a URL serves.** Tilawah's links are shared (PRs, Slack, study circles); embedding the locale in the path makes "this is the Arabic page" inspectable rather than a header negotiation.
- **Amiri is already in the bundle.** Adding Arabic UI does not require a new font fetch on first paint — the typography decision in ADR 0020 quietly already accommodates a full-UI Arabic mode.

## Consequences

Positive:

- Translators receive a single `messages/en.json` table (per app) instead of a code archeology project.
- Setting `/ar` as a URL prefix flips the entire UI without rebuild once the values are populated.
- The "Web English-only" load-bearing assumption in ADR 0009's Update is removed; the timing of the Arabic value pass becomes a single cross-platform decision instead of a per-platform compromise.
- A future audit's Cross-cutting #1 row collapses to "both clients have i18n infrastructure; both currently ship en values."

Negative:

- The migration touches every Component file. Mitigated by the phased plan below and by adopting `t(...)` for *new* code immediately so the migration set only shrinks.
- A new dependency: `next-intl` (~30 KB gzip), plus middleware adds a small server-side hop. Acceptable; it's the smallest viable App Router-native option.
- URL shape changes: `/sign-in` becomes `/en/sign-in`. Existing analytics dashboards and bookmarks need a 30x redirect from un-prefixed paths to the default locale. Tracked as part of Phase 1.
- Diff hygiene: PRs that introduce text must touch `messages/en.json` (and `messages/ar.json` for the mirror) alongside the component. Mitigated by code review and (later) a CI check that fails on `t('key')` calls with no entry in `en.json`.

## Alternatives Considered

- **Hard-code English now, internationalize later.** Rejected for the reason described in Rationale: deferral is the most expensive path, and ADR 0009 already pays for asymmetry today.
- **Roll a hand-rolled dictionary loader** (Next.js docs' "Get Started with Internationalization" pattern). Rejected: it works for the simplest case but leaves the App Router-specific work (Server Component access, middleware, message-key interpolation, pluralization) to grow as bespoke code. The accumulated maintenance cost outweighs `next-intl`'s footprint within the first few features.
- **`react-intl` (FormatJS).** Industry standard, format-rich. Rejected for now: App Router integration is heavier, the `IntlProvider` posture forces Client Component boundaries that `next-intl` avoids. Re-evaluate if ICU message format requirements appear.
- **`i18next` + `react-i18next`.** Larger feature surface than Tilawah currently needs (resource backends, namespace splitting, plural rules), and its Server Component integration is community-maintained rather than library-first. Rejected as overkill.
- **Subdomain locale routing (`ar.tilawah.example`).** Rejected: more deploy complexity than path-prefix and offers no UX advantage for an app where most users arrive from internal links rather than search.
- **Skip Arabic infrastructure on Web entirely.** Considered as a counter-proposal during the audit follow-up: remove iOS i18n instead of adding Web i18n, on the grounds that ar values are unshipped on both sides. Rejected: ADR 0009's reasoning about *infrastructure cost vs values cost* applies identically — the cheap moment to add the bundles is before the codebase fills with literals.

## Migration Plan

Phased to keep PRs reviewable (~200–400 lines each).

- **Phase 1 — Infrastructure only.** Add `next-intl`, `next.config.mjs` updates, `[locale]` route segment, redirect from un-prefixed paths, empty `messages/en.json` and `messages/ar.json` scaffolding. No string call-sites change. ~300 lines.
- **Phase 2 — `(auth)` migration.** Sign-in / sign-up screens, the most user-visible Tilawah text. Pairs cleanly with the iOS sign-in / sign-up `auth.*` keys so the two platforms share the same key namespace where possible. ~400 lines.
- **Phase 3 — `(app)` feature surfaces.** library → practice → result → history, one feature per PR. Each PR touches its components and its key block in `messages/en.json`, with `messages/ar.json` mirroring.
- **Phase 4 — typed `AppError` on Web** (separate ADR). Localized error titles and recovery copy land here, sourced from the same catalogs.
- **Phase 5 — Arabic value pass** (gated by ADR 0009's reconsideration triggers — engaged translator, Web ↔ Android coordination, or ar-locale traffic share).

## Reconsideration Triggers

Re-open the **library choice** when:

1. A third locale (Indonesian, Urdu, Malay, etc.) lands and the message keying becomes a hot spot for type-safety regressions.
2. ICU message format / pluralization / gender requirements appear that `next-intl` does not handle ergonomically.
3. CMS-managed copy is introduced — the catalog source moves from `messages/*.json` to a fetch boundary.

Re-open the **i18n posture itself** (broader than library choice) when:

1. Product decision retires the Arabic-locale story permanently — at which point the bundles can be reduced to a single locale rather than removed (cheaper to keep the abstraction than re-introduce it later).
2. Per-route static export (output: 'export') becomes a requirement and the middleware-based locale routing conflicts.

## References

- [ADR 0009](./0009-ios-internationalization-from-day-one.md) — iOS counterpart, including the 2026-05-09 Update that this ADR responds to.
- [ADR 0020](./0020-amiri-quran-subset.md) — Amiri font subset, prerequisite for Arabic UI without an extra fetch.
- `apps/ios/Sources/QuranRecitationApp/Resources/en.lproj/Localizable.strings` — key shape the web catalogs will mirror.
- `apps/web/app/(auth)/AuthForm.tsx` — representative call-site of the inline-English pattern this ADR retires.
