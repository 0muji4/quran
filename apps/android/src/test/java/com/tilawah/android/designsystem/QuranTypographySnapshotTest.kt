package com.tilawah.android.designsystem

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.dp
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class QuranTypographySnapshotTest(private val variant: RenderVariant) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun quranStyles() {
        captureSnapshot(composeRule, variant, "designsystem/quran_typography_${variant.id}.png") {
            AppTheme {
                Surface(color = AppTheme.colorScheme.surface) {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        Text("ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ", style = AppTheme.quranTypography.ayah)
                        Text(
                            "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ ۚ لَا تَأْخُذُهُۥ سِنَةٌ وَلَا نَوْمٌ",
                            style = AppTheme.quranTypography.ayahLong,
                        )
                        Text("٢٥٥", style = AppTheme.quranTypography.ayahNumber)
                    }
                }
            }
        }
    }

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun parameters(): List<Array<Any>> = RenderVariant.all.map { arrayOf(it) }
    }
}
