package tv.every.tilawah.android.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import tv.every.tilawah.android.RecordingScreen
import tv.every.tilawah.android.backend.ApolloQuranBackend
import tv.every.tilawah.android.backend.QuranBackend
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.features.library.LibraryScreen
import tv.every.tilawah.android.features.library.LibraryViewModel
import tv.every.tilawah.android.telemetry.NoOpTelemetry
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TelemetryEvent

/**
 * Composable root. Sits inside a [BrandTheme] block in [MainActivity]
 * and presents the three-tab Tilawah experience (Library / Practice /
 * History). Mirrors iOS's `AppRoot.swift` (`TabView` + per-tab
 * `NavigationStack`).
 *
 * Library + History tabs ship as placeholders here; PR 9 onward
 * replace them with the real screens. Practice continues to host the
 * legacy `RecordingScreen` until PR 17 swaps it for `PracticeScreen`.
 */
enum class TopLevelTab(val title: String) {
    Library("Library"),
    Practice("Practice"),
    History("History"),
}

@Composable
fun AppRoot(
    telemetry: Telemetry = NoOpTelemetry,
    backend: QuranBackend = remember { ApolloQuranBackend() },
) {
    var selectedTab by rememberSaveable { mutableStateOf(TopLevelTab.Library) }

    LaunchedEffect(selectedTab) {
        if (selectedTab == TopLevelTab.Library) {
            telemetry.event(TelemetryEvent.LIBRARY_TAB_SELECTED)
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                TopLevelTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = {
                            Icon(
                                imageVector = when (tab) {
                                    TopLevelTab.Library -> Icons.Filled.List
                                    TopLevelTab.Practice -> Icons.Filled.PlayArrow
                                    TopLevelTab.History -> Icons.Filled.DateRange
                                },
                                contentDescription = tab.title,
                            )
                        },
                        label = { Text(tab.title) },
                    )
                }
            }
        },
    ) { padding ->
        Surface(
            modifier = Modifier.fillMaxSize().padding(padding),
            color = BrandTheme.colors.surface,
        ) {
            when (selectedTab) {
                TopLevelTab.Library -> LibraryTabHost(backend = backend, telemetry = telemetry)
                TopLevelTab.Practice -> PracticeTabHost()
                TopLevelTab.History -> HistoryTabPlaceholder()
            }
        }
    }
}

@Composable
private fun LibraryTabHost(backend: QuranBackend, telemetry: Telemetry) {
    val viewModel: LibraryViewModel = viewModel(
        factory = viewModelFactory {
            initializer { LibraryViewModel(backend, telemetry) }
        },
    )
    LibraryScreen(
        viewModel = viewModel,
        onSurahOpened = { /* navigation lands in PR 11+ */ },
    )
}

@Composable
private fun PracticeTabHost() {
    // Legacy MVP host until PR 17 retires it in favour of PracticeScreen.
    RecordingScreen()
}

@Composable
private fun HistoryTabPlaceholder() {
    PlaceholderCenter(label = "History — wired in PR 22")
}

@Composable
private fun PlaceholderCenter(label: String) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = label,
                style = BrandTheme.typography.sectionTitle,
                color = BrandTheme.colors.textPrimary,
            )
            Text(
                text = "design parity rebuild in progress",
                style = BrandTheme.typography.caption,
                color = BrandTheme.colors.textSecondary,
            )
        }
    }
}
