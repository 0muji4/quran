package com.tilawah.android

import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.ui.tooling.preview.Preview
import com.tilawah.android.app.AppConfig
import com.tilawah.android.app.AppRoot
import com.tilawah.android.app.authDataStore
import com.tilawah.android.backend.AuthApi
import com.tilawah.android.backend.OkHttpAuthApi
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.storage.AuthSession
import com.tilawah.android.storage.DataStoreAuthSession
import com.tilawah.android.storage.InMemoryAuthSession
import com.tilawah.android.telemetry.NoOpTelemetry
import com.tilawah.android.telemetry.Telemetry
import com.tilawah.android.telemetry.TraceTelemetry

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // BrandTheme is light-only, so the bars need dark icons even when
        // the system is in dark mode, which rules out the default auto style.
        val lightBars = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT)
        enableEdgeToEdge(statusBarStyle = lightBars, navigationBarStyle = lightBars)
        val telemetry: Telemetry = TraceTelemetry(tag = AppConfig.TELEMETRY_SUBSYSTEM)
        val authApi: AuthApi = OkHttpAuthApi()
        // Mirrors the HistoryStore fallback in AppRoot: degrade to a
        // process-lifetime session if DataStore is unavailable so the
        // Profile tab still works for the current launch.
        val authSession: AuthSession = try {
            DataStoreAuthSession(applicationContext.authDataStore)
        } catch (_: Throwable) {
            InMemoryAuthSession()
        }
        setContent {
            BrandTheme {
                AppRoot(
                    telemetry = telemetry,
                    authApi = authApi,
                    authSession = authSession,
                )
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun AppRootPreview() {
    BrandTheme {
        AppRoot(
            telemetry = NoOpTelemetry,
            authApi = OkHttpAuthApi(),
            authSession = InMemoryAuthSession(),
        )
    }
}
