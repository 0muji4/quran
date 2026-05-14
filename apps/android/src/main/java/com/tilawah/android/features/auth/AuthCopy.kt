package com.tilawah.android.features.auth

import androidx.compose.runtime.Immutable

/**
 * Per-[AuthMode] strings shown on the sign-in / sign-up screens. Mirrors
 * `AUTH_COPY` in `apps/web/app/(auth)/copy.ts`. Android omits the eyebrow
 * on sign-in (the design treats "Welcome back" as the title rather than
 * pairing it with an eyebrow as the web's two-panel layout does).
 *
 * Strings live in code rather than `strings.xml` because they are not
 * yet translated — only English ships per ADR 0009 (deferred Arabic
 * translation pass). The keys move into `strings.xml` in the same PR
 * that introduces native Arabic copy.
 */
@Immutable
data class AuthCopy(
    val eyebrow: String?,
    val title: String,
    val lede: String,
    val submit: String,
    val submitPending: String,
)

val AuthCopyByMode: Map<AuthMode, AuthCopy> = mapOf(
    AuthMode.SignIn to AuthCopy(
        eyebrow = null,
        title = "Welcome back",
        lede = "Sign in to continue your practice",
        submit = "Sign in",
        submitPending = "Signing in…",
    ),
    AuthMode.SignUp to AuthCopy(
        eyebrow = "Begin your journey",
        title = "Create your account",
        lede = "Practise daily, track every attempt.",
        submit = "Create account",
        submitPending = "Creating account…",
    ),
)
