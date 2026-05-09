package com.tilawah.android.features.practice

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
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

/**
 * Three-step analysing checklist shown while the worker scores a
 * recording. Mirrors `apps/ios/.../Features/Practice/AnalysingPanel.swift`.
 *
 * Steps progress with the [PracticeState.Analysing.step] machine:
 * Transcribing -> Comparing -> Calculating. Past steps render with a
 * filled tick badge; the current step pulses; future steps render
 * dimmed.
 */
@Composable
fun AnalysingPanel(
    step: AnalysingStep,
    modifier: Modifier = Modifier,
) {
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.md)) {
            Text(
                text = stringResource(R.string.practice_analysing_title),
                style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = BrandTheme.colors.textPrimary,
            )
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
        modifier = Modifier.fillMaxWidth().alpha(if (state == StepRowState.Future) 0.4f else 1f),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Box(
            modifier = Modifier
                .size(28.dp)
                .clip(CircleShape)
                .background(
                    when (state) {
                        StepRowState.Past -> colors.success
                        StepRowState.Current -> colors.primary.copy(alpha = pulse)
                        StepRowState.Future -> colors.tile
                    },
                ),
            contentAlignment = Alignment.Center,
        ) {
            if (state == StepRowState.Past) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = null,
                    tint = colors.textOnPrimary,
                    modifier = Modifier.padding(4.dp),
                )
            }
        }
        Text(
            text = stringResource(labelRes),
            style = typography.body,
            color = colors.textPrimary,
        )
    }
}
