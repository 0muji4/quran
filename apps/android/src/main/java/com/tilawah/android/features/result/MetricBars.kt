package com.tilawah.android.features.result

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
import com.tilawah.android.backend.PronunciationFeedback
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard

/**
 * Accuracy / Fluency / Completeness bars surfaced by the scoring backend.
 * Each row pairs a label with a large serif teal percent and a full-width
 * teal progress track — all three share the same teal accent so the card
 * reads as one cohesive metric block. Mirrors
 * `docs/design/Android _ Result detail`.
 */
@Composable
fun MetricBars(
    feedback: PronunciationFeedback,
    modifier: Modifier = Modifier,
) {
    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.lg)) {
            MetricRow(
                label = stringResource(R.string.result_metric_accuracy),
                fraction = feedback.accuracy.toFloat(),
            )
            MetricRow(
                label = stringResource(R.string.result_metric_fluency),
                fraction = feedback.fluency.toFloat(),
            )
            MetricRow(
                label = stringResource(R.string.result_metric_completeness),
                fraction = feedback.completeness.toFloat(),
            )
        }
    }
}

@Composable
private fun MetricRow(
    label: String,
    fraction: Float,
) {
    val typography = BrandTheme.typography
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    val animated by animateFloatAsState(
        targetValue = fraction.coerceIn(0f, 1f),
        animationSpec = tween(durationMillis = 600),
        label = "metric",
    )
    Column(verticalArrangement = Arrangement.spacedBy(spacing.sm)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.Bottom,
        ) {
            Text(
                text = label,
                style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            Row(verticalAlignment = Alignment.Top) {
                Text(
                    text = "%.0f".format(animated * 100),
                    style = typography.scoreDisplay.copy(fontSize = 24.sp),
                    color = colors.primary,
                )
                Text(
                    text = "%",
                    style = typography.caption,
                    color = colors.primary,
                )
            }
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(8.dp)
                .clip(RoundedCornerShape(percent = 50))
                .background(colors.track),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(animated)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(percent = 50))
                    .background(colors.primary),
            )
        }
    }
}
