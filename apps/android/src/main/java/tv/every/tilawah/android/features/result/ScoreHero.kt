package tv.every.tilawah.android.features.result

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.every.tilawah.android.designsystem.BrandTheme

/**
 * Circular score dial with the percentage in the centre and a verdict
 * pill below. Mirrors `apps/ios/.../Features/Result/ScoreHero.swift`.
 *
 * Score is a 0..1 fraction; null renders as a single dash.
 */
@Composable
fun ScoreHero(
    score: Double?,
    verdict: String?,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    val percentText = score?.let { "%.0f%%".format(it * 100) } ?: "—"
    val a11y = if (score != null) {
        "Recitation score $percentText" + (verdict?.let { ", $it" } ?: "")
    } else {
        "Recitation score not available"
    }
    Column(
        modifier = modifier.semantics(mergeDescendants = true) { contentDescription = a11y },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(spacing.md),
    ) {
        Box(
            modifier = Modifier.size(220.dp),
            contentAlignment = Alignment.Center,
        ) {
            ScoreArc(score = score, baseColor = colors.tile, scoreColor = scoreColor(score, colors))
            Text(
                text = percentText,
                style = typography.scoreDisplay,
                color = colors.textPrimary,
            )
        }
        if (!verdict.isNullOrBlank()) {
            VerdictBadge(verdict = verdict)
        }
    }
}

@Composable
private fun ScoreArc(score: Double?, baseColor: Color, scoreColor: Color) {
    val sweep = ((score ?: 0.0).coerceIn(0.0, 1.0) * 360.0).toFloat()
    Canvas(modifier = Modifier.size(220.dp)) {
        val stroke = 18f
        val pad = stroke / 2f
        val arcSize = Size(size.width - stroke, size.height - stroke)
        val topLeft = Offset(pad, pad)
        drawArc(
            color = baseColor,
            startAngle = 0f,
            sweepAngle = 360f,
            useCenter = false,
            topLeft = topLeft,
            size = arcSize,
            style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
        if (score != null) {
            drawArc(
                color = scoreColor,
                startAngle = -90f,
                sweepAngle = sweep,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = stroke, cap = StrokeCap.Round),
            )
        }
    }
}

@Composable
private fun VerdictBadge(verdict: String) {
    val colors = BrandTheme.colors
    Text(
        text = verdict,
        style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
        color = colors.textOnPrimary,
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(colors.success)
            .padding(horizontal = BrandTheme.spacing.lg, vertical = 8.dp),
    )
}

private fun scoreColor(score: Double?, colors: tv.every.tilawah.android.designsystem.BrandColors): Color {
    if (score == null) return colors.textSecondary
    return when {
        score >= 0.85 -> colors.success
        score >= 0.7 -> colors.primary
        else -> colors.recording
    }
}
