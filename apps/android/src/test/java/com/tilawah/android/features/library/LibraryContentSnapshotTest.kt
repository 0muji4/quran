package com.tilawah.android.features.library

import androidx.compose.foundation.layout.height
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.dp
import com.tilawah.android.app.AppError
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import com.tilawah.android.storage.LastPracticed
import java.io.IOException
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders the Library in each state, in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class LibraryContentSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun library() {
        captureSnapshot(composeRule, variant, "library/${scene.id}_${variant.id}.png") {
            AppTheme {
                LibraryContent(
                    state = scene.state,
                    visibleSurahs = scene.visible,
                    query = scene.query,
                    filter = LibraryFilter.All,
                    lastPracticed = scene.lastPracticed,
                    bestScores = mapOf("1" to 87, "2" to 64),
                    onQueryChange = {},
                    onFilterChange = {},
                    onResume = {},
                    onSurahOpened = {},
                    onRetry = {},
                    // A phone-sized screen, so the list runs to the bottom edge as on a device.
                    modifier = Modifier.height(PHONE_HEIGHT),
                )
            }
        }
    }

    data class Scene(
        val id: String,
        val state: LibraryUiState,
        val visible: List<SurahSummary> = emptyList(),
        val query: String = "",
        val lastPracticed: LastPracticed? = null,
    ) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        private val surahs = listOf(
            SurahSummary("1", "الفاتحة", "Al-Fatiha", "Mecca", 7),
            SurahSummary("2", "البقرة", "Al-Baqarah", "Medina", 286),
            SurahSummary("3", "آل عمران", "Ali 'Imran", "Medina", 200),
            SurahSummary("4", "النساء", "An-Nisa", "Medina", 176),
            SurahSummary("5", "المائدة", "Al-Ma'idah", "Medina", 120),
            SurahSummary("6", "الأنعام", "Al-An'am", "Mecca", 165),
            SurahSummary("7", "الأعراف", "Al-A'raf", "Mecca", 206),
            SurahSummary("8", "الأنفال", "Al-Anfal", "Medina", 75),
        )

        // Noon yesterday, so the card always reads "last practiced yesterday".
        private val zone = ZoneId.systemDefault()
        private val fatihaAyah3 = LastPracticed(
            surahId = "1",
            ayahNumber = 3,
            surahNameEn = "Al-Fatiha",
            surahNameAr = "الفاتحة",
            ayahCount = 7,
            practicedAt = LocalDate.now(zone).minusDays(1).atTime(12, 0).atZone(zone).toInstant(),
        )

        private val loaded = LibraryUiState.Loaded(surahs)

        private val scenes = listOf(
            Scene("resume", loaded, visible = surahs, lastPracticed = fatihaAyah3),
            Scene("getStarted", loaded, visible = surahs),
            Scene("noMatch", loaded, query = "Yasin", lastPracticed = fatihaAyah3),
            Scene("loading", LibraryUiState.Loading),
            Scene("failed", LibraryUiState.Failed(AppError.Network(IOException("offline")))),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
