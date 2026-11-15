package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.PriorityHigh
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.AppTheme

/** How well part of a recitation went. */
enum class AppVerdict { Pass, Warn, Fail }

/** How prominent an [AppVerdictChip] is. */
enum class AppVerdictEmphasis {
    /** The verdict on the whole recitation: larger type and icon. */
    Overall,

    /** The verdict on one tajweed rule: smaller type and icon. */
    Rule,
}

/**
 * A verdict in its container colour with an icon (a check, an exclamation
 * mark or a cross), so the verdict does not rely on colour alone. [label]
 * says the verdict in words.
 */
@Composable
fun AppVerdictChip(
    verdict: AppVerdict,
    label: String,
    modifier: Modifier = Modifier,
    emphasis: AppVerdictEmphasis = AppVerdictEmphasis.Rule,
) {
    val appColors = AppTheme.appColors
    val (container, content) = when (verdict) {
        AppVerdict.Pass -> appColors.passContainer to appColors.onPassContainer
        AppVerdict.Warn -> appColors.warnContainer to appColors.onWarnContainer
        AppVerdict.Fail -> appColors.failContainer to appColors.onFailContainer
    }
    val overall = emphasis == AppVerdictEmphasis.Overall
    Row(
        modifier = modifier
            .heightIn(min = CHIP_HEIGHT)
            // The Material 3 chip shape, as the verdict reads like a chip.
            .background(container, AppTheme.shapes.small)
            .padding(horizontal = if (overall) AppTheme.spacing.space3 else RULE_PADDING)
            .semantics(mergeDescendants = true) {},
        horizontalArrangement = Arrangement.spacedBy(ICON_GAP),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = when (verdict) {
                AppVerdict.Pass -> Icons.Filled.Check
                AppVerdict.Warn -> Icons.Filled.PriorityHigh
                AppVerdict.Fail -> Icons.Filled.Close
            },
            contentDescription = null,
            tint = content,
            modifier = Modifier.size(if (overall) OVERALL_ICON_SIZE else RULE_ICON_SIZE),
        )
        Text(
            text = label,
            style = if (overall) AppTheme.typography.labelLarge else AppTheme.typography.labelMedium,
            color = content,
        )
    }
}

private val CHIP_HEIGHT = 32.dp
private val RULE_PADDING = 10.dp
private val ICON_GAP = 6.dp
private val OVERALL_ICON_SIZE = 16.dp
private val RULE_ICON_SIZE = 14.dp

/** Every verdict at both emphases, for previews and snapshot tests. */
@Composable
internal fun AppVerdictChipSpecimen() {
    val gap = Arrangement.spacedBy(AppTheme.spacing.space2)
    AppVerdictChip(AppVerdict.Pass, "Well recited", emphasis = AppVerdictEmphasis.Overall)
    AppVerdictChip(AppVerdict.Warn, "Nearly there", emphasis = AppVerdictEmphasis.Overall)
    AppVerdictChip(AppVerdict.Fail, "Try again", emphasis = AppVerdictEmphasis.Overall)
    Row(horizontalArrangement = gap) {
        AppVerdictChip(AppVerdict.Pass, "Madd · Good")
        AppVerdictChip(AppVerdict.Warn, "Ghunnah · Check")
    }
    Row(horizontalArrangement = gap) {
        AppVerdictChip(AppVerdict.Fail, "Qalqalah · Missed")
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppVerdictChipPreview() {
    AppSpecimenSurface { AppVerdictChipSpecimen() }
}
