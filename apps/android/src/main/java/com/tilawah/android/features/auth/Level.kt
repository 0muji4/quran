package com.tilawah.android.features.auth

import androidx.compose.runtime.Immutable

/**
 * Self-declared recitation level shown in the sign-up `YOUR LEVEL`
 * selector (matches `LEVEL_OPTIONS` in `apps/web/app/(auth)/copy.ts`).
 * [wireValue] is the value the BFF stores.
 */
enum class Level(val label: String, val description: String, val wireValue: String) {
    Beginner(label = "Beginner", description = "Learning Arabic", wireValue = "beginner"),
    Intermediate(label = "Intermediate", description = "Working on tajweed", wireValue = "intermediate"),
    Advanced(label = "Advanced", description = "Polishing recitation", wireValue = "advanced"),
}

@Immutable
data class LevelOption(val level: Level)

val LevelOptions: List<LevelOption> = Level.entries.map(::LevelOption)

val DefaultLevel: Level = Level.Beginner
