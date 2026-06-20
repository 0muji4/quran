package com.tilawah.android.features.practice

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import com.tilawah.android.designsystem.components.WaveformView
import kotlin.math.sin

/**
 * Analysing panel shown while the worker scores a recording.
 *
 * Layout (mirrors `docs/design/Android _ Practice _ analysing.png`):
 * a leading round light-teal "+" badge beside a bold "Analysing…"
 * title + muted "Comparing to teacher" subtitle, then a large tan
 * rounded tile holding a static teal waveform and the three-step
 * checklist.
 *
 * Steps progress with the [PracticeState.Analysing.step] machine:
 * Transcribing -> Comparing -> Calculating. Past steps render with a
 * filled tick badge; the current step shows a target ring + bold label;
 * future steps render as a stroke-only outline circle, dimmed.
 */
@Composable
fun AnalysingPanel(
    step: AnalysingStep,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth(), style = BrandCardStyle.Paper) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.md),
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(colors.primary.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Add,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = stringResource(R.string.practice_analysing_title),
                        style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.textPrimary,
                    )
                    Text(
                        text = stringResource(R.string.practice_analysing_subtitle),
                        style = typography.caption,
                        color = colors.textSecondary,
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(spacing.cardCornerRadius))
                    .background(colors.tile.copy(alpha = 0.55f))
                    .padding(vertical = spacing.xxl, horizontal = spacing.xl),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(spacing.lg),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    WaveformView(
                        meters = staticWaveform(),
                        barColor = colors.primary.copy(alpha = 0.7f),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = spacing.lg),
                    )
                    Column(
                        verticalArrangement = Arrangement.spacedBy(spacing.sm),
                    ) {
                        ChecklistRow(
                            state = stateFor(step, AnalysingStep.Transcribing),
                            labelRes = R.string.practice_analysing_transcribing,
                        )
                        ChecklistRow(
                            state = stateFor(step, AnalysingStep.Comparing),
                            labelRes = R.string.practice_analysing_comparing,
                        )
                        ChecklistRow(
                            state = stateFor(step, AnalysingStep.Calculating),
                            labelRes = R.string.practice_analysing_calculating,
                        )
                    }
                }
            }
        }
    }
}

private enum class StepRowState { Past, Current, Future }

private fun stateFor(active: AnalysingStep, row: AnalysingStep): StepRowState =
    when {
        active == row -> StepRowState.Current
        active.ordinal > row.ordinal -> StepRowState.Past
        else -> StepRowState.Future
    }

@Composable
private fun ChecklistRow(state: StepRowState, labelRes: Int) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    val pulse = if (state == StepRowState.Current) {
        val transition = rememberInfiniteTransition(label = "step")
        val v by transition.animateFloat(
            initialValue = 0.55f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(900, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "alpha",
        )
        v
    } else {
        1f
    }

    Row(
        modifier = Modifier.fillMaxWidth().alpha(if (state == StepRowState.Future) 0.45f else 1f),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.sm),
    ) {
        StepIcon(state = state, pulse = pulse)
        Text(
            text = stringResource(labelRes),
            style = if (state == StepRowState.Current) {
                typography.body.copy(fontWeight = FontWeight.SemiBold)
            } else {
                typography.body
            },
            color = colors.textPrimary,
        )
    }
}

@Composable
private fun StepIcon(state: StepRowState, pulse: Float) {
    val colors = BrandTheme.colors
    when (state) {
        StepRowState.Past -> Box(
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .background(colors.success),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                imageVector = Icons.Filled.Check,
                contentDescription = null,
                tint = colors.textOnPrimary,
                modifier = Modifier.size(14.dp),
            )
        }
        StepRowState.Current -> Box(
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .border(2.dp, colors.primary.copy(alpha = pulse), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(colors.primary.copy(alpha = pulse)),
            )
        }
        StepRowState.Future -> Box(
            modifier = Modifier
                .size(22.dp)
                .clip(CircleShape)
                .border(1.5.dp, colors.textSecondary, CircleShape),
        )
    }
}

/**
 * Static decorative waveform for the analysing tile. The worker does not
 * stream live amplitudes during scoring, so this is a fixed sinusoidal
 * shape purely to communicate "audio is being processed".
 */
private fun staticWaveform(count: Int = 40): List<Float> =
    List(count) { i ->
        val t = i.toFloat() / count
        (0.4f + 0.55f * sin(t * Math.PI * 5).toFloat()).coerceIn(0.1f, 1f)
    }
