package com.tilawah.android.features.result

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
import com.tilawah.android.backend.PronunciationFeedback
import com.tilawah.android.backend.WordAlignment
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppPanel
import kotlin.math.roundToInt

/**
 * The ayah's words as the recognizer aligned them, right to left and
 * wrapping: green for a match, amber for a substitution with what was heard
 * under it, a dashed struck-through word for one that is missing, and blue
 * for an extra word. A legend and a note that a difference may come from the
 * recognizer follow.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WordComparisonGrid(
    feedback: PronunciationFeedback,
    modifier: Modifier = Modifier,
) {
    if (feedback.wordAlignments.isEmpty()) return
    val spacing = AppTheme.spacing
    AppPanel(modifier = modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(R.string.result_word_grid_title),
                modifier = Modifier.weight(1f),
                style = AppTheme.typography.titleMedium,
            )
            feedback.wer?.let { wer ->
                Text(
                    text = stringResource(R.string.result_word_grid_wer, (wer * 100).roundToInt()),
                    style = AppTheme.typography.bodySmall,
                    color = AppTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(spacing.space2),
                verticalArrangement = Arrangement.spacedBy(spacing.space2),
            ) {
                feedback.wordAlignments.forEach { WordTile(it) }
            }
        }
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(spacing.space3),
            verticalArrangement = Arrangement.spacedBy(spacing.space1),
        ) {
            WordOp.entries.forEach { LegendItem(it) }
        }
        Text(
            text = stringResource(R.string.result_words_note),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** How the recognizer aligned a word with the ayah. */
private enum class WordOp { Match, Substituted, Missing, Extra }

private fun opOf(op: String): WordOp = when (op.lowercase()) {
    "sub", "substitute", "substitution" -> WordOp.Substituted
    "del", "delete", "deletion" -> WordOp.Missing
    "ins", "insert", "insertion" -> WordOp.Extra
    else -> WordOp.Match
}

private data class WordColors(val container: Color, val content: Color, val dashed: Boolean)

@Composable
private fun colorsOf(op: WordOp): WordColors {
    val appColors = AppTheme.appColors
    val colorScheme = AppTheme.colorScheme
    return when (op) {
        WordOp.Match -> WordColors(appColors.passContainer, appColors.onPassContainer, dashed = false)
        WordOp.Substituted -> WordColors(appColors.warnContainer, appColors.onWarnContainer, dashed = false)
        WordOp.Missing -> WordColors(Color.Transparent, colorScheme.onSurfaceVariant, dashed = true)
        WordOp.Extra -> WordColors(colorScheme.secondaryContainer, colorScheme.onSecondaryContainer, dashed = false)
    }
}

@Composable
private fun labelOf(op: WordOp): String = stringResource(
    when (op) {
        WordOp.Match -> R.string.result_word_match
        WordOp.Substituted -> R.string.result_word_substituted
        WordOp.Missing -> R.string.result_word_missing
        WordOp.Extra -> R.string.result_word_extra
    },
)

@Composable
private fun WordTile(alignment: WordAlignment) {
    val op = opOf(alignment.op)
    val colors = colorsOf(op)
    val word = alignment.refWord ?: alignment.hypWord ?: "—"
    val note = when (op) {
        WordOp.Match -> null
        WordOp.Substituted -> alignment.hypWord?.let { stringResource(R.string.result_word_heard, it) }
        WordOp.Missing, WordOp.Extra -> labelOf(op)
    }
    val description = "$word, ${note ?: labelOf(op)}"
    Column(
        modifier = Modifier
            .widthIn(min = 48.dp)
            .wordContainer(colors)
            .padding(horizontal = AppTheme.spacing.space3, vertical = AppTheme.spacing.space1)
            .semantics(mergeDescendants = true) { contentDescription = description },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = word,
            style = AppTheme.quranTypography.ayahNumber.copy(fontSize = WORD_SIZE),
            color = colors.content,
            textDecoration = if (op == WordOp.Missing) TextDecoration.LineThrough else null,
        )
        note?.let { Text(text = it, style = AppTheme.typography.labelSmall, color = colors.content) }
    }
}

@Composable
private fun LegendItem(op: WordOp) {
    val colors = colorsOf(op)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1),
    ) {
        Box(modifier = Modifier.size(10.dp).wordContainer(colors, corner = 3.dp))
        Text(
            text = labelOf(op),
            style = AppTheme.typography.labelSmall,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** The word's container: a filled rounded rectangle, or a dashed outline for a missing word. */
@Composable
private fun Modifier.wordContainer(colors: WordColors, corner: Dp = 8.dp): Modifier {
    val outline = AppTheme.colorScheme.outline
    val shape = RoundedCornerShape(corner)
    return if (colors.dashed) {
        drawBehind {
            val stroke = 1.5.dp.toPx()
            drawRoundRect(
                color = outline,
                topLeft = Offset(stroke / 2, stroke / 2),
                size = Size(size.width - stroke, size.height - stroke),
                cornerRadius = CornerRadius(corner.toPx()),
                style = Stroke(width = stroke, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 3.dp.toPx()))),
            )
        }
    } else {
        background(colors.container, shape)
    }
}

/** Large enough for Amiri's marks to read inside a word tile. */
private val WORD_SIZE = 22.sp
