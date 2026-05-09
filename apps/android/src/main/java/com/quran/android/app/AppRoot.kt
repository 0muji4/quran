package com.quran.android.app

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
import com.quran.android.audio.AudioFocusCoordinator
import com.quran.android.audio.MediaPlayerPlayer
import com.quran.android.audio.MediaRecorderRecorder
import com.quran.android.audio.Player
import com.quran.android.audio.Recorder
import com.quran.android.backend.ApolloQuranBackend
import com.quran.android.backend.QuranBackend
import com.quran.android.designsystem.BrandTheme
import com.quran.android.features.library.LibraryScreen
import com.quran.android.features.library.LibraryViewModel
import com.quran.android.features.practice.PracticeScreen
import com.quran.android.features.practice.PracticeViewModel
import com.quran.android.features.history.HistoryScreen
import com.quran.android.features.history.HistoryViewModel
import com.quran.android.features.result.ResultDetailScreen
import com.quran.android.features.result.ResultDetailViewModel
import com.quran.android.storage.DataStoreHistoryStore
import com.quran.android.storage.HistoryStore
import com.quran.android.storage.InMemoryHistoryStore
import com.quran.android.storage.LastPracticed
import com.quran.android.telemetry.NoOpTelemetry
import com.quran.android.telemetry.Telemetry
import com.quran.android.telemetry.TelemetryEvent

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
                TopLevelTab.History -> HistoryTabHost(historyStore = historyStore)
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
private fun HistoryTabHost(historyStore: HistoryStore) {
    val viewModel: HistoryViewModel = viewModel(
        factory = viewModelFactory {
            initializer { HistoryViewModel(historyStore) }
        },
    )
    HistoryScreen(viewModel = viewModel)
}
