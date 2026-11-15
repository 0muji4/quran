package com.tilawah.android.features.result

import androidx.compose.foundation.layout.height
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.dp
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.backend.PronunciationFeedback
import com.tilawah.android.backend.ScoringResultPayload
import com.tilawah.android.backend.ScoringStatus
import com.tilawah.android.backend.WordAlignment
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import java.io.IOException
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders the Result screen in each state and score band, in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class ResultContentSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun result() {
        captureSnapshot(composeRule, variant, "result/${scene.id}_${variant.id}.png") {
            AppTheme {
                ResultContent(
                    state = scene.state,
                    ayahNumber = 2,
                    teacherPlayer = PlayerState(durationMs = 12_000),
                    youPlayer = PlayerState(durationMs = 11_000),
                    onNavigateBack = {},
                    onPlayTeacher = {},
                    onPauseTeacher = {},
                    onPlayYou = {},
                    onPauseYou = {},
                    onTryAgain = {},
                    onContinue = {},
                    // A phone-sized screen, so the buttons sit at the bottom edge as on a device.
                    modifier = Modifier.height(PHONE_HEIGHT),
                )
            }
        }
    }

    data class Scene(val id: String, val state: ResultDetailViewModel.UiState) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        // 1:2, "al-ḥamdu lillāhi rabbi l-ʿālamīn".
        private const val W1 = "ٱلْحَمْدُ"
        private const val W2 = "لِلَّهِ"
        private const val W3 = "رَبِّ"
        private const val W4 = "ٱلْعَٰلَمِينَ"

        private fun loaded(score: Int, accuracy: Double, cer: Double, completeness: Double, wer: Double, words: List<WordAlignment>) =
            ResultDetailViewModel.UiState.Loaded(
                ScoringResultPayload(
                    jobId = "job-1",
                    status = ScoringStatus.Completed,
                    score = score,
                    verdict = null,
                    segments = emptyList(),
                    feedback = PronunciationFeedback(
                        accuracy = accuracy,
                        completeness = completeness,
                        overall = score / 100.0,
                        referenceAudioUrl = "https://example.com/teacher.mp3",
                        transcript = null,
                        wer = wer,
                        cer = cer,
                        wordAlignments = words,
                    ),
                ),
            )

        private val scenes = listOf(
            Scene(
                "great",
                loaded(
                    87, 0.89, 0.08, 1.0, 0.25,
                    listOf(
                        WordAlignment(W1, W1, "match"),
                        WordAlignment(W2, W2, "match"),
                        WordAlignment(W3, "رَبِّي", "sub"),
                        WordAlignment(W4, W4, "match"),
                    ),
                ),
            ),
            Scene(
                "midway",
                loaded(
                    58, 0.62, 0.29, 0.75, 0.5,
                    listOf(
                        WordAlignment(W1, W1, "match"),
                        WordAlignment(W2, "لِلَّه", "sub"),
                        WordAlignment(W3, null, "del"),
                        WordAlignment(W4, W4, "match"),
                    ),
                ),
            ),
            Scene(
                "beginner",
                loaded(
                    32, 0.35, 0.52, 0.5, 1.0,
                    listOf(
                        WordAlignment(W1, "الحمد", "sub"),
                        WordAlignment(W2, null, "del"),
                        WordAlignment(W3, null, "del"),
                        WordAlignment(W4, W4, "match"),
                        WordAlignment(null, "يَا", "ins"),
                    ),
                ),
            ),
            Scene("loading", ResultDetailViewModel.UiState.Loading),
            Scene("failed", ResultDetailViewModel.UiState.Failed(AppError.Network(IOException("offline")))),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
