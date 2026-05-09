package com.quran.android.telemetry

import android.util.Log
import androidx.tracing.Trace
import com.quran.android.app.AppConfig
import com.quran.android.app.AppError

/**
 * Production [Telemetry] implementation. Writes structured events to
 * Logcat under the [AppConfig.TELEMETRY_SUBSYSTEM] tag and brackets
 * [measure] regions in `androidx.tracing.Trace` so they appear in
 * Perfetto and the Studio Profiler timeline.
 *
 * Future vendor swap (Firebase, Amplitude, OpenTelemetry) is a single
 * implementation change at the [Telemetry] seam.
 */
class TraceTelemetry(
    private val tag: String = AppConfig.TELEMETRY_SUBSYSTEM,
    private val clock: () -> Long = System::currentTimeMillis,
) : Telemetry {

    override fun event(name: String, attributes: Map<String, String>) {
        Log.d(tag, formatEvent(name, attributes))
    }

    override suspend fun <T> measure(name: String, block: suspend () -> T): T {
        Trace.beginSection(name.take(MAX_TRACE_SECTION_NAME))
        val startedAt = clock()
        return try {
            val result = block()
            event(
                "$name.succeeded",
                mapOf(TelemetryAttribute.DURATION_MS to (clock() - startedAt).toString()),
            )
            result
        } catch (cause: Throwable) {
            event(
                "$name.failed",
                buildMap {
                    put(TelemetryAttribute.DURATION_MS, (clock() - startedAt).toString())
                    if (cause is AppError) put(TelemetryAttribute.ERROR_CODE, cause.telemetryCode)
                },
            )
            throw cause
        } finally {
            Trace.endSection()
        }
    }

    override fun error(error: AppError, context: Map<String, String>) {
        val attrs = buildMap {
            put(TelemetryAttribute.ERROR_CODE, error.telemetryCode)
            putAll(context)
        }
        Log.w(tag, "error " + formatEvent(error.telemetryCode, attrs))
    }

    private fun formatEvent(name: String, attributes: Map<String, String>): String {
        if (attributes.isEmpty()) return name
        val pairs = attributes.entries.joinToString(separator = " ") { (k, v) -> "$k=$v" }
        return "$name $pairs"
    }

    private companion object {
        // Trace section names are capped at 127 chars by the platform.
        const val MAX_TRACE_SECTION_NAME = 127
    }
}
