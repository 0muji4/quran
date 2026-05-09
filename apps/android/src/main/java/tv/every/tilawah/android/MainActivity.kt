package tv.every.tilawah.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import tv.every.tilawah.android.app.AppConfig
import tv.every.tilawah.android.app.AppRoot
import tv.every.tilawah.android.designsystem.BrandTheme
import tv.every.tilawah.android.telemetry.NoOpTelemetry
import tv.every.tilawah.android.telemetry.Telemetry
import tv.every.tilawah.android.telemetry.TraceTelemetry

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Provisional telemetry wiring lives here until PR 8+ introduces
        // a proper Application-scoped composition root (mirrors iOS's
        // AppRoot DI pattern, see ADR 0005).
        val telemetry: Telemetry = TraceTelemetry(tag = AppConfig.TELEMETRY_SUBSYSTEM)
        setContent {
            BrandTheme {
                AppRoot(telemetry = telemetry)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun AppRootPreview() {
    BrandTheme {
        AppRoot(telemetry = NoOpTelemetry)
    }
}
