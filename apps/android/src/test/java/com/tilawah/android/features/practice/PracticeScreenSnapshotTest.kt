package com.tilawah.android.features.practice

import androidx.compose.material3.Surface
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import com.tilawah.android.app.AppError
import com.tilawah.android.audio.PlayerState
import com.tilawah.android.backend.AyahDetail
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.BrandTheme
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

@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class PracticeScreenSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun practice() {
        captureSnapshot(composeRule, variant, "practice/${scene.id}_${variant.id}.png") {
            BrandTheme {
                Surface(color = BrandTheme.colors.surface) {
                    PracticeContent(
                        state = scene.state,
                        ayah = scene.ayah,
                        surah = scene.surah,
                        reference = REFERENCE,
                        onNavigateBack = {},
                        onNavigateToAyah = {},
                        onStartRecording = {},
                        onStopRecording = {},
                        onPlayReference = {},
                        onPauseReference = {},
                        onSetReferenceRate = {},
                        onRetryReference = {},
                        onViewResult = {},
                        onReplay = {},
                        onRecordAgain = {},
                    )
                }
            }
        }
    }

    data class Scene(
        val id: String,
        val state: PracticeState,
        val surah: SurahSummary = FATIHAH,
        val ayah: AyahDetail = FATIHAH_2,
    ) {
        override fun toString(): String = id
    }

    companion object {
        private val FATIHAH = SurahSummary(
            id = "1",
            nameAr = "الفاتحة",
            nameEn = "Al-Fatihah",
            revelationPlace = "makkah",
            ayahCount = 7,
        )
        private val FATIHAH_2 = AyahDetail(
            id = "1:2",
            surahId = "1",
            ayahNumber = 2,
            textAr = "ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ",
            textEn = "All praise is for Allah, Lord of all worlds.",
            transliteration = null,
        )
        private val BAQARAH = SurahSummary(
            id = "2",
            nameAr = "البقرة",
            nameEn = "Al-Baqarah",
            revelationPlace = "madinah",
            ayahCount = 286,
        )
        private val BAQARAH_255 = AyahDetail(
            id = "2:255",
            surahId = "2",
            ayahNumber = 255,
            textAr = "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ ۚ " +
                "لَّهُۥ مَا فِى ٱلسَّمَٰوَٰتِ وَمَا فِى ٱلْأَرْضِ ۗ مَن ذَا ٱلَّذِى يَشْفَعُ عِندَهُۥٓ إِلَّا بِإِذْنِهِۦ ۚ " +
                "يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَىْءٍ مِّنْ عِلْمِهِۦٓ إِلَّا بِمَا شَآءَ ۚ " +
                "وَسِعَ كُرْسِيُّهُ ٱلسَّمَٰوَٰتِ وَٱلْأَرْضَ ۖ وَلَا يَـُٔودُهُۥ حِفْظُهُمَا ۚ وَهُوَ ٱلْعَلِىُّ ٱلْعَظِيمُ",
            textEn = "Allah! There is no god except Him, the Ever-Living, All-Sustaining.",
            transliteration = null,
        )
        private val REFERENCE = TeacherReferenceState.Ready(PlayerState(durationMs = 12_000))

        private val scenes = listOf(
            Scene("idle", PracticeState.Idle),
            Scene(
                "recording",
                PracticeState.Recording(
                    meters = List(48) { i -> 0.2f + 0.6f * ((i * 37) % 11) / 10f },
                    durationMs = 4_200,
                ),
            ),
            Scene("uploading", PracticeState.Uploading),
            Scene("analysing_transcribing", PracticeState.Analysing(AnalysingStep.Transcribing)),
            Scene("analysing_comparing", PracticeState.Analysing(AnalysingStep.Comparing)),
            Scene("analysing_calculating", PracticeState.Analysing(AnalysingStep.Calculating)),
            Scene("done", PracticeState.Done(score = 87, jobId = "job-1")),
            Scene("error", PracticeState.Error(AppError.Network(IOException("offline")))),
            Scene("idle_long_surah", PracticeState.Idle, surah = BAQARAH, ayah = BAQARAH_255),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            // BrandTheme has no dark palette, so dark would repeat the light images.
            // The dark variants return when this screen moves to AppTheme.
            scenes.flatMap { scene ->
                RenderVariant.all.filter { !it.dark }.map { arrayOf(scene, it) }
            }
    }
}
