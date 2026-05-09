package com.quran.android

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.quran.android.app.AppConfig
import com.quran.android.app.AppRoot
import com.quran.android.designsystem.BrandTheme
import com.quran.android.telemetry.NoOpTelemetry
import com.quran.android.telemetry.Telemetry
import com.quran.android.telemetry.TraceTelemetry

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
