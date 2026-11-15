package com.tilawah.android.designsystem.components

import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.createEmptyComposeRule
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

/** Renders each component specimen in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class AppComponentsSnapshotTest(private val variant: RenderVariant) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun buttons() = snapshot("buttons") { AppButtonsSpecimen() }

    @Test
    fun surfaces() = snapshot("surfaces") { AppSurfacesSpecimen() }

    @Test
    fun chip() = snapshot("chip") { AppChipSpecimen() }

    @Test
    fun progress() = snapshot("progress") { AppProgressSpecimen() }

    @Test
    fun waveform() = snapshot("waveform") { AppWaveformSpecimen() }

    private fun snapshot(name: String, specimen: @Composable () -> Unit) {
        captureSnapshot(composeRule, variant, "designsystem/components/${name}_${variant.id}.png") {
            AppSpecimenSurface { specimen() }
        }
    }

    companion object {
        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}")
        fun parameters(): List<Array<Any>> = RenderVariant.all.map { arrayOf(it) }
    }
}
