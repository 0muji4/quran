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

    const val editTitle: String = "Edit profile"
    const val editDisplayNameLabel: String = "DISPLAY NAME"
    const val editLevelLabel: String = "YOUR LEVEL"
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

    fun levelLabel(raw: String): String = when (raw) {
        "beginner" -> "Beginner"
        "intermediate" -> "Intermediate"
        "advanced" -> "Advanced"
        else -> raw
    }
}
