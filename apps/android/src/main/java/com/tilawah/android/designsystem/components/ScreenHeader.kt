package com.tilawah.android.designsystem.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Standard in-app screen header used by the Practice and Result screens:
 * a circular outlined back control on the left, a centered title, and an
 * optional circular outlined overflow ("…") control on the right. When
 * [onMore] is null a balancing spacer keeps the title optically centered.
 *
 * Matches the Android Figma exports (`docs/design/Android _ Practice *`,
 * `Android _ Result detail`).
 */
@Composable
fun ScreenHeader(
    title: String,
    onBack: () -> Unit,
    backContentDescription: String,
    modifier: Modifier = Modifier,
    onMore: (() -> Unit)? = null,
    moreContentDescription: String? = null,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(spacing.sm),
    ) {
        CircleIconButton(
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = backContentDescription,
            onClick = onBack,
        )
        Text(
            text = title,
            style = BrandTheme.typography.sectionTitle,
            color = colors.textPrimary,
            textAlign = TextAlign.Center,
            modifier = Modifier.weight(1f),
        )
        if (onMore != null) {
            CircleIconButton(
                icon = Icons.Filled.MoreHoriz,
                contentDescription = moreContentDescription.orEmpty(),
                onClick = onMore,
            )
        } else {
            // Balance the leading button so the title stays centered.
            Box(Modifier.size(spacing.minTapTarget))
        }
    }
}

@Composable
private fun CircleIconButton(
    icon: ImageVector,
    contentDescription: String,
    onClick: () -> Unit,
) {
    val colors = BrandTheme.colors
    val spacing = BrandTheme.spacing
    Box(
        modifier = Modifier
            .size(spacing.minTapTarget)
            .clip(CircleShape)
            .border(BorderStroke(1.dp, colors.borderDefault), CircleShape)
            .clickable(onClick = onClick)
            .semantics { },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = colors.textPrimary,
            modifier = Modifier.size(20.dp),
        )
    }
}
