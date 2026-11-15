package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.designsystem.AppTheme

/**
 * The main card of a screen, such as the one that holds the ayah: the low
 * surface container with the extra-large corner radius.
 */
@Composable
fun AppCard(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(AppTheme.spacing.space5),
    verticalArrangement: Arrangement.Vertical = Arrangement.spacedBy(AppTheme.spacing.space2),
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = AppTheme.shapes.extraLarge,
        color = AppTheme.colorScheme.surfaceContainerLow,
        contentColor = AppTheme.colorScheme.onSurface,
    ) {
        Column(
            modifier = Modifier.padding(contentPadding),
            verticalArrangement = verticalArrangement,
            content = content,
        )
    }
}

/** The colour of an [AppPanel]. */
enum class AppPanelTone {
    /** The surface container, for rows and status panels. */
    Neutral,

    /** The error container, for a failure and what to do about it. */
    Error,
}

/**
 * A panel inside or below a card, such as the teacher recitation row or the
 * analysing, scored and error panels: the large corner radius.
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
    Surface(
        modifier = modifier,
        shape = AppTheme.shapes.large,
        color = when (tone) {
            AppPanelTone.Neutral -> colorScheme.surfaceContainer
            AppPanelTone.Error -> colorScheme.errorContainer
        },
        contentColor = when (tone) {
            AppPanelTone.Neutral -> colorScheme.onSurface
            AppPanelTone.Error -> colorScheme.onErrorContainer
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
