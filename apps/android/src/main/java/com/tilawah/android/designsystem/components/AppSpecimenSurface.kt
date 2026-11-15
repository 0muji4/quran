package com.tilawah.android.designsystem.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.tilawah.android.designsystem.AppTheme

/**
 * The page a component specimen is drawn on, in `@Preview` functions and in
 * the component snapshot tests: the theme's surface colour, with the
 * specimen's rows stacked at a 16dp margin.
 */
@Composable
internal fun AppSpecimenSurface(content: @Composable ColumnScope.() -> Unit) {
    AppTheme {
        Surface(color = AppTheme.colorScheme.surface) {
            Column(
                modifier = Modifier.fillMaxSize().padding(AppTheme.spacing.space4),
                verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4),
                content = content,
            )
        }
    }
}
