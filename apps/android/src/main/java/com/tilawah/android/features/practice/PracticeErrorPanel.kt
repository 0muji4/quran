package com.tilawah.android.features.practice

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ErrorOutline
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppButton
import com.tilawah.android.designsystem.components.AppButtonVariant
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppPanelTone

/**
 * The panel for any [PracticeState.Error]: what went wrong, then Replay and
 * Record again.
 *
 * The copy is this panel's own ("Couldn't hear that" / "Try again — move
 * closer to the mic") rather than [AppError.titleRes], because the error
 * strings are shared across screens. The scoring limit is the exception:
 * moving closer or replaying cannot help, so it shows the [AppError] copy
 * and only Record again.
 */
@Composable
fun PracticeErrorPanel(
    error: AppError,
    onReplay: () -> Unit,
    onRecordAgain: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val limitReached = error == AppError.ScoringLimitReached
    val spacing = AppTheme.spacing
    AppPanel(modifier = modifier, tone = AppPanelTone.Error) {
        Row(horizontalArrangement = Arrangement.spacedBy(spacing.space3)) {
            Icon(imageVector = Icons.Outlined.ErrorOutline, contentDescription = null)
            Column(verticalArrangement = Arrangement.spacedBy(spacing.space1)) {
                Text(
                    text = stringResource(
                        if (limitReached) error.titleRes else R.string.practice_error_too_short_title,
                    ),
                    style = AppTheme.typography.titleMedium,
                )
                Text(
                    text = stringResource(
                        if (limitReached) error.recoveryRes else R.string.practice_error_too_short_subtitle,
                    ),
                    style = AppTheme.typography.bodyMedium,
                )
            }
        }
        Row(
            modifier = Modifier.align(Alignment.End),
            horizontalArrangement = Arrangement.spacedBy(spacing.space2),
        ) {
            if (!limitReached) {
                AppButton(
                    text = stringResource(R.string.practice_error_replay),
                    onClick = onReplay,
                    variant = AppButtonVariant.Text,
                )
            }
            AppButton(
                text = stringResource(R.string.practice_error_record_again),
                onClick = onRecordAgain,
                variant = AppButtonVariant.Filled,
            )
        }
    }
}
