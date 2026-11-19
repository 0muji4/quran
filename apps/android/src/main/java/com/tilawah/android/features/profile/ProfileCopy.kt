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
    const val editCancel: String = "Cancel"
    const val editSave: String = "Save"
    const val editSavePending: String = "Saving…"

    const val showPasswordA11y: String = "Show password"
    const val hidePasswordA11y: String = "Hide password"

    const val changeEmailTitle: String = "Change email"
    const val changeEmailNewLabel: String = "New email"
    const val changeEmailNewHelper: String = "You'll sign in with this address next time."
    const val changeEmailCurrentPasswordLabel: String = "Current password"
    const val changeEmailCurrentPasswordHelper: String = "To confirm it's you."
    const val changeEmailSave: String = "Update email"
    const val changeEmailSavePending: String = "Updating…"

    const val updatePasswordTitle: String = "Update password"
    const val updatePasswordCurrentLabel: String = "Current password"
    const val updatePasswordNewLabel: String = "New password"
    const val updatePasswordNewHelper: String = "At least 8 characters."
    const val updatePasswordConfirmLabel: String = "Confirm new password"
    const val updatePasswordSave: String = "Update password"
    const val updatePasswordSavePending: String = "Updating…"

    const val deleteAccountTitle: String = "Delete account"
    const val deleteAccountWarningTitle: String = "This deactivates your account"
    const val deleteAccountBody: String =
        "Your account is closed now and kept for 30 days. Sign back in within 30 days to restore it. " +
            "After that, your data is deleted for good."
    const val deleteAccountConfirmLabel: String = "Type DELETE to confirm"
    const val deleteAccountConfirmHelper: String = "In capital letters."
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
