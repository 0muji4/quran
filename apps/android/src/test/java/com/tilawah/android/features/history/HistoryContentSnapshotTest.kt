package com.tilawah.android.features.history

import androidx.compose.foundation.layout.height
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import com.tilawah.android.storage.Attempt
import com.tilawah.android.storage.AttemptStatus
import java.time.LocalDate
import java.time.ZoneId
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders History in each state, in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class HistoryContentSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun history() {
        captureSnapshot(composeRule, variant, "history/${scene.id}_${variant.id}.png") {
            AppTheme {
                HistoryContent(
                    attempts = scene.attempts,
                    visibleAttempts = scene.attempts.filter { scene.surahId == null || it.surahId == scene.surahId },
                    filter = scene.filter,
                    filterOptions = options,
                    onFilterChange = {},
                    // A phone-sized screen, so the list runs to the bottom edge as on a device.
                    modifier = Modifier.height(PHONE_HEIGHT),
                    now = now,
                )
            }
        }
    }

    data class Scene(
        val id: String,
        val attempts: List<Attempt>,
        val filter: HistoryFilter = HistoryFilter.All,
        val surahId: String? = null,
    ) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        // A fixed clock and fixed times, so the totals and the "Today" / "Yesterday"
        // labels read the same on every run.
        private val zone = ZoneId.systemDefault()
        private val today = LocalDate.of(2026, 11, 19)
        private val now = today.atTime(18, 0).atZone(zone).toInstant()

        private fun attempt(
            id: String,
            surahId: String,
            surahNameEn: String,
            ayah: Int,
            daysAgo: Long,
            hour: Int,
            minute: Int,
            score: Int?,
        ) = Attempt(
            id = id,
            surahId = surahId,
            surahNameEn = surahNameEn,
            ayahNumber = ayah,
            score = score,
            jobId = "job-$id",
            createdAt = today.minusDays(daysAgo).atTime(hour, minute).atZone(zone).toInstant(),
            status = AttemptStatus.COMPLETED,
        )

        /** Newest first, as the history store returns them; one is still being scored. */
        private val attempts = listOf(
            attempt("a1", "1", "Al-Fatiha", 3, 0, 14, 2, 87),
            attempt("a2", "1", "Al-Fatiha", 2, 0, 13, 48, 64),
            attempt("a3", "36", "Ya-Sin", 1, 1, 20, 15, 92),
            attempt("a4", "2", "Al-Baqarah", 255, 1, 19, 40, 38),
            attempt("a5", "67", "Al-Mulk", 1, 4, 8, 30, null),
            attempt("a6", "1", "Al-Fatiha", 1, 4, 8, 10, 75),
            attempt("a7", "2", "Al-Baqarah", 1, 5, 21, 5, 58),
        )

        private val fatiha = HistoryFilter.Surah("1", "Al-Fatiha")
        private val options = listOf(
            HistoryFilter.All,
            fatiha,
            HistoryFilter.Surah("36", "Ya-Sin"),
            HistoryFilter.Surah("2", "Al-Baqarah"),
            HistoryFilter.Surah("67", "Al-Mulk"),
        )

        private val scenes = listOf(
            Scene("all", attempts),
            Scene("filtered", attempts, filter = fatiha, surahId = "1"),
            Scene("empty", emptyList()),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
