package tv.every.tilawah.android.telemetry

import tv.every.tilawah.android.app.AppError

/**
 * Discards every telemetry call. Used by Compose previews and unit
 * tests where Logcat noise would obscure the signal.
 */
object NoOpTelemetry : Telemetry {
    override fun event(name: String, attributes: Map<String, String>) = Unit

    override suspend fun <T> measure(name: String, block: suspend () -> T): T = block()

    override fun error(error: AppError, context: Map<String, String>) = Unit
}
