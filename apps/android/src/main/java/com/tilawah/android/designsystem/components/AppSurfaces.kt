package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.designsystem.AppTheme

/**
 * The main card of a screen, such as the one that holds the ayah: a Material 3
 * elevated card at its default shape, colour and elevation.
 */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(AppTheme.spacing.space4),
    verticalArrangement: Arrangement.Vertical = Arrangement.spacedBy(AppTheme.spacing.space2),
    content: @Composable ColumnScope.() -> Unit,
) {
    ElevatedCard(modifier = modifier) {
        Column(
            modifier = Modifier.padding(contentPadding),
            verticalArrangement = verticalArrangement,
            content = content,
        )
    }
}

/** The colour of an [AppPanel]. */
enum class AppPanelTone {
    /** A Material 3 filled card, for rows and status panels. */
    Neutral,

    /** A filled card on the error container, for a failure and what to do about it. */
    Error,
}

/**
 * A panel inside or below a card, such as the teacher recitation row or the
 * analysing, scored and error panels: a Material 3 filled card at its default
 * shape. [AppPanelTone.Error] changes only its colours.
 */
@Composable
fun AppPanel(
    modifier: Modifier = Modifier,
    tone: AppPanelTone = AppPanelTone.Neutral,
    contentPadding: PaddingValues = PaddingValues(AppTheme.spacing.space4),
    verticalArrangement: Arrangement.Vertical = Arrangement.spacedBy(AppTheme.spacing.space3),
    content: @Composable ColumnScope.() -> Unit,
) {
    val colorScheme = AppTheme.colorScheme
    Card(
        modifier = modifier,
        colors = when (tone) {
            AppPanelTone.Neutral -> CardDefaults.cardColors()
            AppPanelTone.Error -> CardDefaults.cardColors(
                containerColor = colorScheme.errorContainer,
                contentColor = colorScheme.onErrorContainer,
            )
        },
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            verticalArrangement = verticalArrangement,
            content = content,
        )
    }
}

/** A card and both panel tones, for previews and snapshot tests. */
@Composable
internal fun AppSurfacesSpecimen() {
    val typography = AppTheme.typography
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Text("Card", style = typography.titleMedium)
        Text("The main card of a screen.", style = typography.bodyMedium)
    }
    AppPanel(modifier = Modifier.fillMaxWidth()) {
        Text("Panel", style = typography.titleMedium)
        Text("A row or status panel.", style = typography.bodyMedium)
    }
    AppPanel(modifier = Modifier.fillMaxWidth(), tone = AppPanelTone.Error) {
        Text("Error panel", style = typography.titleMedium)
        Text("What went wrong and what to do next.", style = typography.bodyMedium)
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppSurfacesPreview() {
    AppSpecimenSurface { AppSurfacesSpecimen() }
}
