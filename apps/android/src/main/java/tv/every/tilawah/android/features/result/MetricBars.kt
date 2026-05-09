package tv.every.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import tv.every.tilawah.android.R
import tv.every.tilawah.android.backend.PronunciationFeedback
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.BrandCard
import tv.every.tilawah.android.designsystem.components.BrandProgressBar

/**
 * Three [BrandProgressBar]s for the Accuracy / Fluency / Completeness
 * metrics surfaced by the scoring backend. Mirrors
 * `apps/ios/.../Features/Result/MetricBars.swift`.
 */
@Composable
fun MetricBars(
    feedback: PronunciationFeedback,
    modifier: Modifier = Modifier,
) {
    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md)) {
            Text(
                text = stringResource(R.string.result_metrics_title),
                style = BrandTheme.typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = BrandTheme.colors.textPrimary,
            )
            BrandProgressBar(
                label = stringResource(R.string.result_metric_accuracy),
                fraction = feedback.accuracy.toFloat(),
            )
            BrandProgressBar(
                label = stringResource(R.string.result_metric_fluency),
                fraction = feedback.fluency.toFloat(),
                barColor = BrandTheme.colors.accent,
            )
            BrandProgressBar(
                label = stringResource(R.string.result_metric_completeness),
                fraction = feedback.completeness.toFloat(),
                barColor = BrandTheme.colors.success,
            )
        }
    }
}
