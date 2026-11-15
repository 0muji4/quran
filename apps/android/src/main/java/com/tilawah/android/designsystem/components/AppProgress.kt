package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.AppTheme

/** Where an [AppStep] is in a sequence. */
enum class AppStepStatus { Done, Active, Todo }

/** One step of an [AppStepList]. */
data class AppStep(
    val label: String,
    val status: AppStepStatus,
)

/**
 * Steps that run in order, such as transcribing, comparing and scoring: a
 * check on the pass colour for each step done, a Material 3 circular progress
 * indicator for the active step, and an empty ring for the steps to come.
 * Progress bars are Material 3's `LinearProgressIndicator`, used as it is
 * (ADR 0030).
 */
@Composable
fun AppStepList(
    steps: List<AppStep>,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
        steps.forEach { step ->
            Row(
                modifier = Modifier
                    .heightIn(min = STEP_ROW_HEIGHT)
                    .semantics(mergeDescendants = true) {},
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space3),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AppStepMarker(step.status)
                Text(
                    text = step.label,
                    style = AppTheme.typography.bodyLarge,
                    color = if (step.status == AppStepStatus.Todo) {
                        AppTheme.colorScheme.onSurfaceVariant
                    } else {
                        AppTheme.colorScheme.onSurface
                    },
                )
            }
        }
    }
}

@Composable
private fun AppStepMarker(status: AppStepStatus) {
    val appColors = AppTheme.appColors
    Box(modifier = Modifier.size(STEP_MARKER_SIZE), contentAlignment = Alignment.Center) {
        when (status) {
            AppStepStatus.Done -> Box(
                modifier = Modifier
                    .size(STEP_DONE_SIZE)
                    .background(appColors.pass, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Filled.Check,
                    contentDescription = null,
                    tint = appColors.onPass,
                    modifier = Modifier.size(STEP_CHECK_SIZE),
                )
            }
            AppStepStatus.Active -> CircularProgressIndicator(modifier = Modifier.size(STEP_MARKER_SIZE))
            AppStepStatus.Todo -> Box(
                modifier = Modifier
                    .size(STEP_RING_SIZE)
                    .border(2.dp, AppTheme.colorScheme.outline, CircleShape),
            )
        }
    }
}

private val STEP_ROW_HEIGHT = 40.dp
private val STEP_MARKER_SIZE = 24.dp
private val STEP_DONE_SIZE = 22.dp
private val STEP_RING_SIZE = 20.dp
private val STEP_CHECK_SIZE = 14.dp

/**
 * The step list in a panel, with Material 3 linear progress indicators for the
 * ayah position and the analysing progress, for previews and snapshot tests.
 */
@Composable
internal fun AppProgressSpecimen() {
    val spacing = AppTheme.spacing
    LinearProgressIndicator(progress = { 1f / 7f }, modifier = Modifier.fillMaxWidth())
    LinearProgressIndicator(progress = { 255f / 286f }, modifier = Modifier.fillMaxWidth())
    AppPanel {
        AppStepList(
            steps = listOf(
                AppStep("Transcribing your recitation", AppStepStatus.Done),
                AppStep("Comparing with the teacher", AppStepStatus.Active),
                AppStep("Calculating your score", AppStepStatus.Todo),
            ),
        )
        LinearProgressIndicator(
            progress = { 0.55f },
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space2),
        )
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppProgressPreview() {
    AppSpecimenSurface { AppProgressSpecimen() }
}
