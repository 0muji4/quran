package tv.every.tilawah.android.app

import kotlinx.serialization.Serializable

/**
 * Type-safe navigation destinations consumed by Compose Navigation 2.8
 * via [androidx.navigation.NavHostController.navigate]. Mirrors iOS's
 * `Route` enum + per-tab `NavigationPath` (ADR 0005).
 *
 * Each tab owns its own `NavHost` so the back stacks stay independent
 * (a user can drill into Library, jump to History, and return to find
 * Library still drilled in). Cross-tab jumps from the Library Continue
 * card flip the selected tab and navigate within the Practice graph.
 */
sealed interface Route {

    @Serializable
    data object Library : Route

    @Serializable
    data class Practice(val surahId: String, val ayahNumber: Int) : Route

    @Serializable
    data class Result(val jobId: String) : Route

    @Serializable
    data object History : Route
}
