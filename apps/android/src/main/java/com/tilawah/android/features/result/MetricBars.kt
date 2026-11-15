package com.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.backend.PronunciationFeedback
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppPanel
import kotlin.math.roundToInt

/**
 * Accuracy, character match and completeness, each as a percentage over a
 * linear progress indicator. Character match is `1 − CER`; without a CER it
 * falls back to the overall score. chirp_3 gives no per-word confidence, so
 * there is no fluency row.
 */
@Composable
fun MetricBars(
    feedback: PronunciationFeedback,
    modifier: Modifier = Modifier,
) {
    AppPanel(modifier = modifier.fillMaxWidth()) {
        Text(text = stringResource(R.string.result_metrics_title), style = AppTheme.typography.titleMedium)
        MetricRow(stringResource(R.string.result_metric_accuracy), feedback.accuracy.toFloat())
        MetricRow(
            stringResource(R.string.result_metric_character_match),
            (feedback.cer?.let { 1 - it } ?: feedback.overall).toFloat(),
        )
        MetricRow(stringResource(R.string.result_metric_completeness), feedback.completeness.toFloat())
    }
}

@Composable
private fun MetricRow(label: String, fraction: Float) {
    val clamped = fraction.coerceIn(0f, 1f)
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2)) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(text = label, modifier = Modifier.weight(1f), style = AppTheme.typography.bodyMedium)
            Text(
                text = stringResource(R.string.result_metric_percent, (clamped * 100).roundToInt()),
                style = AppTheme.typography.labelLarge,
                color = AppTheme.colorScheme.primary,
            )
        }
        LinearProgressIndicator(progress = { clamped }, modifier = Modifier.fillMaxWidth())
    }
}
