package com.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.app.AppError
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import com.tilawah.android.designsystem.components.PrimaryButton
import com.tilawah.android.designsystem.components.SecondaryButton

/**
 * Error card shown by the Practice screen for any
 * [PracticeState.Error]. Mirrors `docs/design/Android _ Practice _ error.png`:
 * a LEFT-aligned header row (small coral mic badge + bold title + muted
 * subtitle), a large inset tile holding a dashed coral circle with a
 * plain mic glyph and a centered caption, then a Replay / Record-again
 * button pair.
 *
 * Copy is rendered design-specific here ("Couldn't hear that" / "Try
 * again — move closer to the mic") rather than via [AppError.titleRes],
 * because those error strings are shared across screens and the Figma
 * wording is panel-specific.
 *
 * [error] is retained in the signature for the call site and future
 * per-error copy/telemetry; the current design renders one canonical
 * "recording too short" layout with both Replay + Record again actions.
 * TODO: branch copy on [error] when the design covers other failures
 * (network / scoring timeout).
 */
@Composable
fun PracticeErrorPanel(
    @Suppress("UNUSED_PARAMETER") error: AppError,
    onReplay: () -> Unit,
    onRecordAgain: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth(), style = BrandCardStyle.Paper) {
        Column(verticalArrangement = Arrangement.spacedBy(spacing.lg)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.md),
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(colors.recording.copy(alpha = 0.14f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Filled.Mic,
                        contentDescription = null,
                        tint = colors.recording,
                        modifier = Modifier.size(18.dp),
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = stringResource(R.string.practice_error_too_short_title),
                        style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                        color = colors.textPrimary,
                    )
                    Text(
                        text = stringResource(R.string.practice_error_too_short_subtitle),
                        style = typography.caption,
                        color = colors.textSecondary,
                    )
                }
            }

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(spacing.cardCornerRadius))
                    .background(colors.tile.copy(alpha = 0.55f))
                    .padding(vertical = spacing.xxl, horizontal = spacing.xl),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(spacing.lg),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    DashedMicBadge()
                    Text(
                        text = stringResource(R.string.practice_error_too_short_caption),
                        style = typography.caption,
                        color = colors.textSecondary,
                        textAlign = TextAlign.Center,
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(spacing.md),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SecondaryButton(
                            label = stringResource(R.string.practice_error_replay),
                            onClick = onReplay,
                            fillWidth = false,
                        )
                        PrimaryButton(
                            label = stringResource(R.string.practice_error_record_again),
                            onClick = onRecordAgain,
                            fillWidth = false,
                        )
                    }
                }
            }
        }
    }
}

/** A plain mic glyph inside a dashed coral circle (drawn, not an asset). */
@Composable
private fun DashedMicBadge() {
    val colors = BrandTheme.colors
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(CircleShape)
            .background(colors.recording.copy(alpha = 0.08f))
            .drawBehind {
                drawCircle(
                    color = colors.recording,
                    radius = size.minDimension / 2f - 1.dp.toPx(),
                    style = Stroke(
                        width = 1.5.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(
                            floatArrayOf(6.dp.toPx(), 6.dp.toPx()),
                            0f,
                        ),
                    ),
                )
            },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = Icons.Filled.Mic,
            contentDescription = null,
            tint = colors.recording,
            modifier = Modifier.size(28.dp),
        )
    }
}
