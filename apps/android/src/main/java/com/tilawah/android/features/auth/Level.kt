package com.tilawah.android.features.auth

import androidx.compose.runtime.Immutable

/**
 * Self-declared recitation level shown in the sign-up `YOUR LEVEL`
 * selector. UI-only this pass: the choice is held in the AuthViewModel
 * but is not sent to the BFF (matches `LEVEL_OPTIONS` in
 * `apps/web/app/(auth)/copy.ts`). Persistence lands with a later
 * profile-preferences PR.
 */
enum class Level(val label: String, val description: String) {
    Beginner(label = "Beginner", description = "Learning Arabic"),
    Intermediate(label = "Intermediate", description = "Working on tajweed"),
    Advanced(label = "Advanced", description = "Polishing recitation"),
}

@Immutable
data class LevelOption(val level: Level)

val LevelOptions: List<LevelOption> = Level.entries.map(::LevelOption)

val DefaultLevel: Level = Level.Beginner
