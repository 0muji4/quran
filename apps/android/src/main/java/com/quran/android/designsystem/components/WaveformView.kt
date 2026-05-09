package com.quran.android.designsystem.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.unit.dp

/**
 * Lightweight Canvas waveform — renders [meters] as a horizontal row of
 * vertical bars centred vertically. Mirrors
 * `apps/ios/.../DesignSystem/Components/WaveformView.swift`. Intended
 * for the Recording panel's live-amplitude render and the listen-back
 * row's static playback render.
 */
@Composable
fun WaveformView(
    meters: List<Float>,
    barColor: Color,
    modifier: Modifier = Modifier,
) {
    Canvas(
        modifier = modifier.height(64.dp),
    ) {
        if (meters.isEmpty()) return@Canvas
        val barWidth = (size.width / meters.size).coerceAtLeast(1f)
        val centerY = size.height / 2f
        meters.forEachIndexed { index, level ->
            val clamped = level.coerceIn(0f, 1f)
            val barHeight = (clamped * size.height).coerceAtLeast(2f)
            val x = index * barWidth + barWidth / 2f
            drawLine(
                color = barColor,
                start = Offset(x, centerY - barHeight / 2f),
                end = Offset(x, centerY + barHeight / 2f),
                strokeWidth = barWidth * 0.55f,
                cap = StrokeCap.Round,
            )
        }
        // Anchor the empty state with a baseline rule so the panel still
        // visually communicates "ready to record" before the first sample.
        if (meters.all { it < 0.02f }) {
            drawLine(
                color = barColor.copy(alpha = 0.4f),
                start = Offset(0f, centerY),
                end = Offset(size.width, centerY),
                strokeWidth = 1.5f,
            )
        }
    }
}

/** Convenience overload that takes a fixed-size buffer for previews. */
@Composable
fun WaveformView(
    meters: FloatArray,
    barColor: Color,
    modifier: Modifier = Modifier,
) {
    WaveformView(meters = meters.toList(), barColor = barColor, modifier = modifier)
}

/** Preview helper used by tests / @Preview composables. */
internal fun previewMeters(count: Int = 64, peak: Float = 0.6f): List<Float> {
    return List(count) { i ->
        val t = i.toFloat() / count
        (peak * (0.4f + 0.6f * kotlin.math.sin(t * Math.PI * 4).toFloat()))
            .coerceIn(0f, 1f)
    }
}

@Suppress("UNUSED")
private fun Size.unused() = Unit
