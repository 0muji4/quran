package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.lerp
import com.tilawah.android.designsystem.AppTheme

/**
 * The live input level as a row of bars, one per entry of [levels] (0 to 1),
 * oldest first. It is 56dp tall; each bar is 4dp wide with a 3dp gap, so 28
 * levels take 193dp. It is drawn only: screen readers skip it.
 */
@Composable
fun AppWaveform(
    levels: List<Float>,
    modifier: Modifier = Modifier,
    color: Color = AppTheme.appColors.recording,
) {
    Row(
        modifier = modifier
            .height(WAVEFORM_HEIGHT)
            .clearAndSetSemantics {},
        horizontalArrangement = Arrangement.spacedBy(BAR_GAP),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        levels.forEach { level ->
            Box(
                modifier = Modifier
                    .width(BAR_WIDTH)
                    .height(lerp(MIN_BAR_HEIGHT, WAVEFORM_HEIGHT, level.coerceIn(0f, 1f)))
                    .background(color, RoundedCornerShape(BAR_WIDTH / 2)),
            )
        }
    }
}

private val WAVEFORM_HEIGHT = 56.dp
private val MIN_BAR_HEIGHT = 4.dp
private val BAR_WIDTH = 4.dp
private val BAR_GAP = 3.dp

/** Fixed levels that look like speech, for previews and snapshot tests. */
internal val specimenLevels: List<Float> = List(28) { i ->
    val wave = kotlin.math.abs(kotlin.math.sin(i * 0.7) * kotlin.math.cos(i * 0.23))
    (0.1 + 0.75 * wave).toFloat()
}

/** A waveform at speech levels and at silence, for previews and snapshot tests. */
@Composable
internal fun AppWaveformSpecimen() {
    AppWaveform(levels = specimenLevels)
    AppWaveform(levels = List(28) { 0f })
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppWaveformPreview() {
    AppSpecimenSurface { AppWaveformSpecimen() }
}
