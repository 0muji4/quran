package tv.every.tilawah.android.app

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import tv.every.tilawah.android.audio.AudioFocusCoordinator
import tv.every.tilawah.android.audio.MediaPlayerPlayer
import tv.every.tilawah.android.audio.MediaRecorderRecorder
import tv.every.tilawah.android.audio.Player
import tv.every.tilawah.android.audio.Recorder
import tv.every.tilawah.android.backend.ApolloQuranBackend
import tv.every.tilawah.android.backend.QuranBackend
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.features.library.LibraryScreen
import tv.every.tilawah.android.features.library.LibraryViewModel
import tv.every.tilawah.android.features.practice.PracticeScreen
import tv.every.tilawah.android.features.practice.PracticeViewModel
import tv.every.tilawah.android.features.result.ResultDetailScreen
import tv.every.tilawah.android.features.result.ResultDetailViewModel
import tv.every.tilawah.android.storage.DataStoreHistoryStore
import tv.every.tilawah.android.storage.HistoryStore
import tv.every.tilawah.android.storage.InMemoryHistoryStore
import tv.every.tilawah.android.storage.LastPracticed
import tv.every.tilawah.android.telemetry.NoOpTelemetry
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TelemetryEvent

/**
 * Composable root. Sits inside a [BrandTheme] block in [MainActivity]
 * and presents the three-tab Tilawah experience (Library / Practice /
 * History). Mirrors iOS's `AppRoot.swift` (`TabView` + per-tab
 * `NavigationStack`).
 */
enum class TopLevelTab(val title: String) {
    Library("Library"),
    Practice("Practice"),
    History("History"),
}

/** Defaults to Al-Fatihah ayah 1 when nothing else has been selected. */
private val DefaultPractice = LastPracticed(
    surahId = "1",
    ayahNumber = 1,
    surahNameEn = "Al-Fatihah",
    surahNameAr = "الفاتحة",
    ayahCount = 7,
    practicedAt = java.time.Instant.EPOCH,
)

@Composable
fun AppRoot(
    telemetry: Telemetry = NoOpTelemetry,
    backend: QuranBackend = remember { ApolloQuranBackend() },
    historyStore: HistoryStore = defaultHistoryStore(),
) {
    var selectedTab by rememberSaveable { mutableStateOf(TopLevelTab.Library) }
    var practiceTarget by remember { mutableStateOf(DefaultPractice) }
    var resultJobId: String? by remember { mutableStateOf(null) }
    var resultRecordingPath: String? by remember { mutableStateOf(null) }

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
                TopLevelTab.Library -> LibraryTabHost(
                    backend = backend,
                    telemetry = telemetry,
                    historyStore = historyStore,
                    onResume = { entry ->
                        practiceTarget = entry
                        selectedTab = TopLevelTab.Practice
                    },
                )
                TopLevelTab.Practice -> {
                    val activeResult = resultJobId
                    if (activeResult != null) {
                        ResultTabHost(
                            backend = backend,
                            telemetry = telemetry,
                            jobId = activeResult,
                            recordingPath = resultRecordingPath,
                            target = practiceTarget,
                            onNavigateBack = { resultJobId = null },
                            onTryAgain = { resultJobId = null },
                            onContinue = {
                                practiceTarget = practiceTarget.copy(
                                    ayahNumber = practiceTarget.ayahNumber + 1,
                                )
                                resultJobId = null
                                resultRecordingPath = null
                            },
                        )
                    } else {
                        PracticeTabHost(
                            target = practiceTarget,
                            backend = backend,
                            telemetry = telemetry,
                            historyStore = historyStore,
                            onNavigateBack = { selectedTab = TopLevelTab.Library },
                            onResultRequested = { jobId, recPath ->
                                resultJobId = jobId
                                resultRecordingPath = recPath
                            },
                        )
                    }
                }
                TopLevelTab.History -> HistoryTabPlaceholder()
            }
        }
    }
}

@Composable
private fun LibraryTabHost(
    backend: QuranBackend,
    telemetry: Telemetry,
    historyStore: HistoryStore,
    onResume: (LastPracticed) -> Unit,
) {
    val viewModel: LibraryViewModel = viewModel(
        factory = viewModelFactory {
            initializer { LibraryViewModel(backend, telemetry, historyStore) }
        },
    )
    LibraryScreen(
        viewModel = viewModel,
        onSurahOpened = { /* surah-detail navigation lands when Result/Practice graph stabilises */ },
        onResume = onResume,
    )
}

@Composable
private fun PracticeTabHost(
    target: LastPracticed,
    backend: QuranBackend,
    telemetry: Telemetry,
    historyStore: HistoryStore,
    onNavigateBack: () -> Unit,
    onResultRequested: (jobId: String, recordingPath: String?) -> Unit,
) {
    val context = LocalContext.current
    val focus = remember(context) {
        AudioFocusCoordinator(
            context.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager,
        )
    }
    val recorder: Recorder = remember(context, focus) { MediaRecorderRecorder(context, focus) }
    val player: Player = remember(focus) { MediaPlayerPlayer(focus) }

    val viewModel: PracticeViewModel = viewModel(
        key = "practice-${target.surahId}-${target.ayahNumber}",
        factory = viewModelFactory {
            initializer {
                PracticeViewModel(
                    backend = backend,
                    recorder = recorder,
                    player = player,
                    historyStore = historyStore,
                    telemetry = telemetry,
                    surahId = target.surahId,
                    ayahNumber = target.ayahNumber,
                )
            }
        },
    )

    var hasMicPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO,
            ) == PackageManager.PERMISSION_GRANTED,
        )
    }
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted -> hasMicPermission = granted }

    PracticeScreen(
        viewModel = viewModel,
        onNavigateBack = onNavigateBack,
        onResultRequested = { jobId ->
            onResultRequested(jobId, viewModel.lastRecording?.file?.absolutePath)
        },
        onRequestPermission = { permissionLauncher.launch(Manifest.permission.RECORD_AUDIO) },
        hasMicPermission = hasMicPermission,
    )
}

@Composable
private fun ResultTabHost(
    backend: QuranBackend,
    telemetry: Telemetry,
    jobId: String,
    recordingPath: String?,
    target: LastPracticed,
    onNavigateBack: () -> Unit,
    onTryAgain: () -> Unit,
    onContinue: () -> Unit,
) {
    val context = LocalContext.current
    val focus = remember(context) {
        AudioFocusCoordinator(
            context.getSystemService(android.content.Context.AUDIO_SERVICE) as android.media.AudioManager,
        )
    }
    val teacherPlayer: Player = remember(focus) { MediaPlayerPlayer(focus) }
    val youPlayer: Player = remember(focus) { MediaPlayerPlayer(focus) }

    val viewModel: ResultDetailViewModel = viewModel(
        key = "result-$jobId",
        factory = viewModelFactory {
            initializer {
                ResultDetailViewModel(
                    backend = backend,
                    telemetry = telemetry,
                    jobId = jobId,
                    surahId = target.surahId,
                    ayahNumber = target.ayahNumber,
                    teacherPlayer = teacherPlayer,
                    youPlayer = youPlayer,
                    recordingPath = recordingPath,
                )
            }
        },
    )

    ResultDetailScreen(
        viewModel = viewModel,
        onNavigateBack = onNavigateBack,
        onTryAgain = onTryAgain,
        onContinue = onContinue,
    )
}

@Composable
private fun defaultHistoryStore(): HistoryStore {
    val context = LocalContext.current
    return remember(context) {
        try {
            DataStoreHistoryStore(context.applicationContext.historyDataStore)
        } catch (_: Throwable) {
            InMemoryHistoryStore()
        }
    }
}

@Composable
private fun HistoryTabPlaceholder() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.sm),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = "History — wired in PR 22",
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
