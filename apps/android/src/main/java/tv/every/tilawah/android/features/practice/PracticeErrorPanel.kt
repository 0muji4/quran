package tv.every.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import tv.every.tilawah.android.R
import tv.every.tilawah.android.app.AppError
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.designsystem.components.BrandCard
import tv.every.tilawah.android.designsystem.components.PrimaryButton

/**
 * Error card shown by the Practice screen for any
 * [PracticeState.Error]. Mirrors
 * `apps/ios/.../Features/Practice/PracticeErrorPanel.swift`. The
 * primary CTA flips between "Replay" (retriable network /
 * scoring-timeout / backend.unavailable) and "Record again"
 * (permission / audio / reference / storage failures).
 */
@Composable
fun PracticeErrorPanel(
    error: AppError,
    onReplay: () -> Unit,
    onRecordAgain: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth()) {
        Column(
            verticalArrangement = Arrangement.spacedBy(spacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(colors.recording.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.MicOff,
                    contentDescription = null,
                    tint = colors.recording,
                )
            }
            Text(
                text = stringResource(error.titleRes),
                style = typography.sectionTitle,
                color = colors.textPrimary,
            )
            Text(
                text = stringResource(error.recoveryRes),
                style = typography.caption,
                color = colors.textSecondary,
            )
            PrimaryButton(
                label = stringResource(
                    if (error.isRetriable) R.string.practice_error_replay
                    else R.string.practice_error_record_again,
                ),
                onClick = if (error.isRetriable) onReplay else onRecordAgain,
            )
        }
    }
}
