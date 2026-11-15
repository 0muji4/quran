package com.tilawah.android.features.practice

import androidx.annotation.StringRes
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.designsystem.components.AppPanel
import com.tilawah.android.designsystem.components.AppStep
import com.tilawah.android.designsystem.components.AppStepList
import com.tilawah.android.designsystem.components.AppStepStatus

/**
 * The three scoring steps while the backend scores a recording, with a
 * progress bar that advances one step at a time. The bar never reaches the
 * end: the panel gives way to the score when scoring finishes.
 */
@Composable
fun AnalysingPanel(
    step: AnalysingStep,
    modifier: Modifier = Modifier,
) {
    val steps = AnalysingStep.entries
    AppPanel(modifier = modifier) {
        Text(
            text = stringResource(R.string.practice_analysing_title),
            style = AppTheme.typography.titleMedium,
        )
        AppStepList(
            steps = steps.map { row -> AppStep(stringResource(row.labelRes), statusOf(row, step)) },
        )
        LinearProgressIndicator(
            progress = { (step.ordinal + 1f) / (steps.size + 1) },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

private fun statusOf(row: AnalysingStep, active: AnalysingStep): AppStepStatus = when {
    row == active -> AppStepStatus.Active
    row.ordinal < active.ordinal -> AppStepStatus.Done
    else -> AppStepStatus.Todo
}

@get:StringRes
private val AnalysingStep.labelRes: Int
    get() = when (this) {
        AnalysingStep.Transcribing -> R.string.practice_analysing_transcribing
        AnalysingStep.Comparing -> R.string.practice_analysing_comparing
        AnalysingStep.Calculating -> R.string.practice_analysing_calculating
    }
