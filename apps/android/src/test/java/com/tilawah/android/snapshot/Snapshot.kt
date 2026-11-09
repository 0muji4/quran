package com.tilawah.android.snapshot

import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.onRoot
import androidx.test.core.app.ActivityScenario
import com.github.takahirom.roborazzi.captureRoboImage
import org.robolectric.RuntimeEnvironment

/**
 * Renders [content] in [variant] and compares it with `src/test/snapshots/<path>`.
 *
 * The configuration is applied before the activity starts, because changing it afterwards
 * recreates the activity. [composeRule] must be an empty rule: it drives the composition so
 * infinite animations stop instead of keeping the capture waiting for idle.
 */
fun captureSnapshot(
    composeRule: ComposeTestRule,
    variant: RenderVariant,
    path: String,
    content: @Composable () -> Unit,
) {
    RuntimeEnvironment.setQualifiers(variant.qualifiers)
    RuntimeEnvironment.setFontScale(variant.fontScale)
    ActivityScenario.launch(ComponentActivity::class.java).use { scenario ->
        scenario.onActivity { it.setContent(content = content) }
        composeRule.onRoot().captureRoboImage("src/test/snapshots/$path")
    }
}
