package tv.every.tilawah.android.features.result

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import tv.every.tilawah.android.R
import tv.every.tilawah.android.backend.PronunciationFeedback
import tv.every.tilawah.android.backend.WordAlignment
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.BrandCard
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.layout.heightIn

/**
 * Word-comparison tile grid driven by `feedback.wordAlignments[]`.
 * Mirrors `apps/ios/.../Features/Result/WordComparisonGrid.swift`.
 *
 * Tile color encodes the alignment op (match / sub / del / ins);
 * the WER footnote sits below.
 */
@Composable
fun WordComparisonGrid(
    feedback: PronunciationFeedback,
    modifier: Modifier = Modifier,
) {
    if (feedback.wordAlignments.isEmpty()) return
    val typography = BrandTheme.typography
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.md)) {
            Text(
                text = stringResource(R.string.result_word_grid_title),
                style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 96.dp),
                contentPadding = PaddingValues(0.dp),
                horizontalArrangement = Arrangement.spacedBy(spacing.sm),
                verticalArrangement = Arrangement.spacedBy(spacing.sm),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 0.dp, max = 320.dp),
            ) {
                items(feedback.wordAlignments) { alignment ->
                    WordTile(alignment = alignment)
                }
            }
            feedback.wer?.let { wer ->
                Text(
                    text = stringResource(R.string.result_word_grid_wer, wer * 100),
                    style = typography.caption,
                    color = colors.textSecondary,
                )
            }
        }
    }
}

@Composable
private fun WordTile(alignment: WordAlignment) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    val tileColor = colorForOp(alignment.op, colors)
    val text = alignment.refWord ?: alignment.hypWord ?: "—"

    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(tileColor)
            .padding(horizontal = spacing.md, vertical = spacing.sm),
        verticalArrangement = Arrangement.spacedBy(2.dp),
    ) {
        Text(
            text = text,
            style = typography.body.copy(fontWeight = FontWeight.SemiBold),
            color = colors.textOnPrimary,
        )
        Text(
            text = labelForOp(alignment.op),
            style = typography.caption,
            color = colors.textOnPrimary.copy(alpha = 0.85f),
        )
    }
}

private fun colorForOp(op: String, colors: tv.every.tilawah.android.designsystem.BrandColors): Color =
    when (op.lowercase()) {
        "match" -> colors.success
        "sub", "substitute", "substitution" -> colors.recording
        "del", "delete", "deletion" -> colors.recording.copy(alpha = 0.7f)
        "ins", "insert", "insertion" -> colors.accent
        else -> colors.primary
    }

private fun labelForOp(op: String): String = when (op.lowercase()) {
    "match" -> "match"
    "sub", "substitute", "substitution" -> "substituted"
    "del", "delete", "deletion" -> "missing"
    "ins", "insert", "insertion" -> "extra"
    else -> op
}
