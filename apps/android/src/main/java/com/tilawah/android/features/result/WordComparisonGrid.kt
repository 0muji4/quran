package com.tilawah.android.features.result

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.backend.PronunciationFeedback
import com.tilawah.android.backend.WordAlignment
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import androidx.compose.ui.res.stringResource

/**
 * Word-comparison tiles driven by `feedback.wordAlignments[]`. Tiles use
 * pale tonal fills with dark text and sit in a single right-aligned RTL
 * row; the card header carries an abbreviated "WER 12%" on the right.
 * Mirrors `docs/design/Android _ Result detail`.
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.result_word_grid_title),
                    style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                    color = colors.textPrimary,
                )
                feedback.wer?.let { wer ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(spacing.xs),
                    ) {
                        Text(
                            text = stringResource(R.string.result_word_grid_wer_label),
                            style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                            color = colors.textSecondary,
                        )
                        Text(
                            text = stringResource(R.string.result_word_grid_wer_value, Math.round(wer * 100).toInt()),
                            style = typography.caption.copy(fontWeight = FontWeight.SemiBold),
                            color = colors.primary,
                        )
                    }
                }
            }
            // Arabic reads right-to-left, so lay the tiles in an RTL row.
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(spacing.sm),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    feedback.wordAlignments.forEach { alignment ->
                        WordTile(alignment = alignment)
                    }
                }
            }
            Text(
                text = stringResource(R.string.result_words_note),
                style = typography.caption,
                color = colors.textSecondary,
            )
        }
    }
}

@Composable
private fun WordTile(alignment: WordAlignment) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing
    val tileColor = tileFillForOp(alignment.op, colors)
    val text = alignment.refWord ?: alignment.hypWord ?: "—"
    val opLabel = labelForOp(alignment.op)

    Text(
        text = text,
        style = typography.arabicAyah.copy(fontSize = typography.body.fontSize),
        color = colors.textPrimary,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(tileColor)
            .padding(horizontal = spacing.md, vertical = spacing.sm)
            .semantics(mergeDescendants = true) {
                contentDescription = "$text ($opLabel)"
            },
    )
}

/**
 * Pale tonal fill per alignment op — dark text sits on top. Matches use a
 * mint wash; everything else uses a light cream/gold wash (a low-alpha
 * tint of [BrandColors.accent], which is too saturated to use solid).
 */
private fun tileFillForOp(op: String, colors: com.tilawah.android.designsystem.BrandColors): Color =
    when (op.lowercase()) {
        "match" -> colors.mintBg
        else -> colors.accent.copy(alpha = 0.18f)
    }

private fun labelForOp(op: String): String = when (op.lowercase()) {
    "match" -> "match"
    "sub", "substitute", "substitution" -> "substituted"
    "del", "delete", "deletion" -> "missing"
    "ins", "insert", "insertion" -> "extra"
    else -> op
}
