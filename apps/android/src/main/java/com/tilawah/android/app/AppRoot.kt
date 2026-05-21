package com.tilawah.android.app

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
import androidx.compose.material.icons.filled.AccountCircle
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
import com.tilawah.android.audio.AudioFocusCoordinator
import com.tilawah.android.audio.MediaPlayerPlayer
import com.tilawah.android.audio.MediaRecorderRecorder
import com.tilawah.android.audio.Player
import com.tilawah.android.audio.Recorder
import com.tilawah.android.backend.ApolloQuranBackend
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.DefaultAuthedHttpClient
import com.tilawah.android.backend.HttpProfileService
import com.tilawah.android.backend.OkHttpAuthApi
import com.tilawah.android.backend.ProfileService
import com.tilawah.android.backend.QuranBackend
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.features.library.LibraryScreen
import com.tilawah.android.features.library.LibraryViewModel
import com.tilawah.android.features.practice.PracticeScreen
import com.tilawah.android.features.practice.PracticeViewModel
import com.tilawah.android.features.history.HistoryScreen
import com.tilawah.android.features.history.HistoryViewModel
import com.tilawah.android.features.profile.ProfileAuthHost
import com.tilawah.android.features.profile.ProfileViewModel
import com.tilawah.android.features.result.ResultDetailScreen
import com.tilawah.android.features.result.ResultDetailViewModel
import com.tilawah.android.storage.AuthSession
import com.tilawah.android.storage.DataStoreHistoryStore
import com.tilawah.android.storage.HistoryStore
import com.tilawah.android.storage.InMemoryAuthSession
import com.tilawah.android.storage.InMemoryHistoryStore
import com.tilawah.android.storage.LastPracticed
import com.tilawah.android.telemetry.NoOpTelemetry
import com.tilawah.android.telemetry.Telemetry
import com.tilawah.android.telemetry.TelemetryEvent

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
    Profile("Profile"),
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
    authApi: AuthApi = remember { OkHttpAuthApi() },
    authSession: AuthSession = remember { InMemoryAuthSession() },
    profileService: ProfileService = remember(authSession) {
        HttpProfileService(http = DefaultAuthedHttpClient(authSession))
    },
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
                                    TopLevelTab.Profile -> Icons.Filled.AccountCircle
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
                TopLevelTab.Profile -> ProfileTabHost(
                    authApi = authApi,
                    authSession = authSession,
                    profileService = profileService,
                )
            }
        }
    }
}

@Composable
private fun ProfileTabHost(
    authApi: AuthApi,
    authSession: AuthSession,
    profileService: ProfileService,
) {
    val viewModel: ProfileViewModel = viewModel(
        factory = viewModelFactory {
            initializer { ProfileViewModel(authSession = authSession) }
        },
    )
    ProfileAuthHost(
        authApi = authApi,
        authSession = authSession,
        profileService = profileService,
        profileViewModel = viewModel,
    )
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
