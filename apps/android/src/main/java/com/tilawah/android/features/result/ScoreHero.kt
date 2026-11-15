package com.tilawah.android.features.result

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppCard
import com.tilawah.android.designsystem.components.AppVerdict
import com.tilawah.android.designsystem.components.AppVerdictChip
import com.tilawah.android.designsystem.components.AppVerdictEmphasis

/**
 * The score out of 100 with its verdict chip, then the verdict band's
 * headline and advice. Score is whole points out of 100; null shows a dash
 * and no chip.
 */
@Composable
fun ScoreHero(
    score: Int?,
    modifier: Modifier = Modifier,
) {
    val band = verdictBandForScore(score)
    AppCard(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space2),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1),
            ) {
                Text(
                    text = score?.toString() ?: "—",
                    modifier = Modifier.alignByBaseline(),
                    style = AppTheme.typography.displayLarge,
                    color = AppTheme.colorScheme.primary,
                )
                Text(
                    text = stringResource(R.string.result_score_of_100),
                    modifier = Modifier.alignByBaseline(),
                    style = AppTheme.typography.bodyLarge,
                    color = AppTheme.colorScheme.onSurfaceVariant,
                )
            }
            band.appVerdict?.let { verdict ->
                AppVerdictChip(
                    verdict = verdict,
                    label = stringResource(band.badgeRes),
                    emphasis = AppVerdictEmphasis.Overall,
                )
            }
        }
        Text(text = stringResource(band.headlineRes), style = AppTheme.typography.titleLarge)
        Text(
            text = stringResource(band.subheadRes),
            style = AppTheme.typography.bodyMedium,
            color = AppTheme.colorScheme.onSurfaceVariant,
        )
    }
}

/** The verdict chip a score band shows; none while the score is not in yet. */
val VerdictBand.appVerdict: AppVerdict?
    get() = when (this) {
        VerdictBand.Mastered, VerdictBand.Great -> AppVerdict.Pass
        VerdictBand.Midway -> AppVerdict.Warn
        VerdictBand.Beginner -> AppVerdict.Fail
        VerdictBand.Awaiting -> null
    }
