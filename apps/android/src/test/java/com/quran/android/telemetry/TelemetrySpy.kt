package com.quran.android.telemetry

import com.quran.android.app.AppError

/**
 * Test double for [Telemetry]. Records every call so unit tests can
 * assert event names, attribute keys, and error codes. Mirrors
 * `apps/ios/Tests/QuranRecitationAppTests/TelemetrySpy.swift`.
 *
 * `measure` records `<name>.succeeded` / `<name>.failed` synthetic
 * events with a `duration_ms="0"` placeholder so assertions are
 * deterministic; tests should not rely on the value.
 */
class TelemetrySpy : Telemetry {
    sealed interface Record {
        data class Event(val name: String, val attributes: Map<String, String>) : Record
        data class Error(val code: String, val context: Map<String, String>) : Record
    }

    private val _records = mutableListOf<Record>()
    val records: List<Record> get() = _records.toList()

    val eventNames: List<String>
        get() = _records.filterIsInstance<Record.Event>().map { it.name }

    fun reset() {
        _records.clear()
    }

    override fun event(name: String, attributes: Map<String, String>) {
        _records += Record.Event(name, attributes)
    }

    override suspend fun <T> measure(name: String, block: suspend () -> T): T {
        return try {
            val result = block()
            _records += Record.Event("$name.succeeded", mapOf("duration_ms" to "0"))
            result
        } catch (cause: Throwable) {
            val attrs = buildMap {
                put("duration_ms", "0")
                if (cause is AppError) put("error_code", cause.telemetryCode)
            }
            _records += Record.Event("$name.failed", attrs)
            throw cause
        }
    }

    override fun error(error: AppError, context: Map<String, String>) {
        _records += Record.Error(error.telemetryCode, context)
    }
}
