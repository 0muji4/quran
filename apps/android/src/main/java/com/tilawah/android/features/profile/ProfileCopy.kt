package com.tilawah.android.features.profile

/**
 * UI strings for the Profile tab and its modal sheets. Lives in code
 * rather than `strings.xml` until the deferred Arabic translation pass
 * lands (ADR 0009 update 2026-05-09) — same convention as
 * `apps/android/.../features/auth/AuthCopy.kt`.
 */
object ProfileCopy {
    const val editEntryLabel: String = "Edit profile"
    const val changeEmailEntryLabel: String = "Change email"
    const val updatePasswordEntryLabel: String = "Update password"
    const val deleteAccountEntryLabel: String = "Delete account"

    const val editTitle: String = "Edit profile"
    const val editDisplayNameLabel: String = "DISPLAY NAME"
    // Figma "Android _ Edit profile" labels this field "SKILL LEVEL"
    // (was "YOUR LEVEL"). The on-screen copy lives in strings.xml; this
    // constant is retained for any caller still reading it.
    const val editLevelLabel: String = "SKILL LEVEL"
    const val editCancel: String = "Cancel"
    const val editSave: String = "Save"
    const val editSavePending: String = "Saving…"

    const val changeEmailTitle: String = "Change email"
    const val changeEmailNewLabel: String = "NEW EMAIL"
    const val changeEmailCurrentPasswordLabel: String = "CURRENT PASSWORD"
    const val changeEmailCurrentPasswordHelper: String =
        "We re-verify your current password before rotating your email."
    const val changeEmailSave: String = "Update email"
    const val changeEmailSavePending: String = "Updating…"

    const val updatePasswordTitle: String = "Update password"
    const val updatePasswordCurrentLabel: String = "CURRENT PASSWORD"
    const val updatePasswordNewLabel: String = "NEW PASSWORD"
    const val updatePasswordNewHelper: String = "At least 8 characters."
    const val updatePasswordConfirmLabel: String = "CONFIRM NEW PASSWORD"
    const val updatePasswordSave: String = "Update password"
    const val updatePasswordSavePending: String = "Updating…"

    const val deleteAccountTitle: String = "Delete account"
    const val deleteAccountBody: String =
        "Your account will be soft-deleted. You have 30 days to recover it by signing in; after that the row is removed permanently."
    const val deleteAccountConfirmLabel: String = "TYPE DELETE TO CONFIRM"
    const val deleteAccountSave: String = "Delete account"
    const val deleteAccountSavePending: String = "Deleting…"

    const val reactivationTitle: String = "Welcome back"
    const val reactivationBody: String =
        "We restored your account. Your practice history is back where you left it."
    const val reactivationDismissA11y: String = "Dismiss"

    fun levelLabel(raw: String): String = when (raw) {
        "beginner" -> "Beginner"
        "intermediate" -> "Intermediate"
        "advanced" -> "Advanced"
        else -> raw
    }
}
