package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import com.tilawah.android.designsystem.AppTheme

/**
 * The one-shot "Welcome back" message above the Profile content after a
 * sign-in that reactivated a soft-deleted account (ADR 0024 §4). It uses the
 * pass container colour, as a good outcome. The close button calls
 * `AuthSession.acknowledgeReactivationNotice`, so the message does not come
 * back on a tab switch.
 */
@Composable
fun ReactivationBanner(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val appColors = AppTheme.appColors
    Card(
        modifier = modifier
            .fillMaxWidth()
            .semantics { liveRegion = LiveRegionMode.Polite },
        colors = CardDefaults.cardColors(
            containerColor = appColors.passContainer,
            contentColor = appColors.onPassContainer,
        ),
    ) {
        Row(
            modifier = Modifier.padding(start = AppTheme.spacing.space4, top = AppTheme.spacing.space3),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
            verticalAlignment = Alignment.Top,
        ) {
            Icon(imageVector = Icons.Outlined.CheckCircle, contentDescription = null)
            Column(
                modifier = Modifier.weight(1f).padding(bottom = AppTheme.spacing.space3),
                verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1),
            ) {
                Text(text = ProfileCopy.reactivationTitle, style = AppTheme.typography.titleMedium)
                Text(text = ProfileCopy.reactivationBody, style = AppTheme.typography.bodyMedium)
            }
            IconButton(onClick = onDismiss) {
                Icon(imageVector = Icons.Filled.Close, contentDescription = ProfileCopy.reactivationDismissA11y)
            }
        }
    }
}
