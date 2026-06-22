package com.tilawah.android.features.result

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle

/**
 * Paper score card: a pale-mint verdict pill, a circular score dial with
 * the raw 0–100 numeral (no percent sign) above an "OF 100" caption, and
 * an encouragement subtitle. Mirrors `docs/design/Android _ Result detail`.
 *
 * Score is a 0..1 fraction; null renders as a single dash.
 */
@Composable
fun ScoreHero(
    score: Double?,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    // The dial shows the raw 0–100 score; the percent form is reserved for a11y.
    // Round (not truncate) so 0.87 reads as "87" rather than "86".
    val scoreValue = score?.let { Math.round(it * 100).toInt() }
    val scoreText = scoreValue?.toString() ?: "—"
    val verdictBand = verdictBandForScore(scoreValue)
    val verdictBadge = stringResource(verdictBand.badgeRes)
    val a11y = if (scoreValue != null) {
        "Recitation score $scoreValue out of 100, $verdictBadge"
    } else {
        "Recitation score not available"
    }
    BrandCard(
        modifier = modifier.fillMaxWidth(),
        style = BrandCardStyle.Paper,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .semantics(mergeDescendants = true) { contentDescription = a11y },
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(spacing.lg),
        ) {
            VerdictBadge(verdict = verdictBadge)
            Box(
                modifier = Modifier.size(180.dp),
                contentAlignment = Alignment.Center,
            ) {
                ScoreArc(score = score, baseColor = colors.track, scoreColor = colors.primary)
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = scoreText,
                        style = typography.scoreDisplay,
                        color = colors.textPrimary,
                    )
                    Text(
                        text = stringResource(R.string.result_score_of_100),
                        style = typography.caption,
                        color = colors.textSecondary,
                    )
                }
            }
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(spacing.xs),
            ) {
                Text(
                    text = stringResource(verdictBand.headlineRes),
                    style = typography.body.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(verdictBand.subheadRes),
                    style = typography.caption,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ScoreArc(score: Double?, baseColor: Color, scoreColor: Color) {
    val sweep = ((score ?: 0.0).coerceIn(0.0, 1.0) * 360.0).toFloat()
    Canvas(modifier = Modifier.size(180.dp)) {
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
    val spacing = BrandTheme.spacing
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .clip(RoundedCornerShape(percent = 50))
            .background(colors.mintBg)
            .padding(horizontal = spacing.lg, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.xs),
    ) {
        Icon(
            imageVector = Icons.Filled.Check,
            contentDescription = null,
            tint = colors.mintInk,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = verdict,
            style = BrandTheme.typography.eyebrow.copy(fontWeight = FontWeight.SemiBold),
            color = colors.mintInk,
        )
    }
}
