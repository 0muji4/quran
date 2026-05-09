package tv.every.tilawah.android.telemetry

import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import tv.every.tilawah.android.app.AppError

class TelemetrySpyTest {

    @Test
    fun `event records name and attributes`() {
        val spy = TelemetrySpy()
        spy.event("library.surah.opened", mapOf("surah_id" to "1"))
        val record = spy.records.single() as TelemetrySpy.Record.Event
        assertEquals("library.surah.opened", record.name)
        assertEquals(mapOf("surah_id" to "1"), record.attributes)
    }

    @Test
    fun `error records telemetry code from AppError`() {
        val spy = TelemetrySpy()
        spy.error(AppError.ScoringTimeout, mapOf("ayah" to "3"))
        val record = spy.records.single() as TelemetrySpy.Record.Error
        assertEquals("scoring_timeout", record.code)
        assertEquals(mapOf("ayah" to "3"), record.context)
    }

    @Test
    fun `measure emits succeeded event on success and returns value`() = runTest {
        val spy = TelemetrySpy()
        val result = spy.measure("practice.upload.completed") { 42 }
        assertEquals(42, result)
        val event = spy.records.single() as TelemetrySpy.Record.Event
        assertEquals("practice.upload.completed.succeeded", event.name)
        assertEquals("0", event.attributes["duration_ms"])
    }

    @Test
    fun `measure emits failed event with error code on AppError`() = runTest {
        val spy = TelemetrySpy()
        assertThrows(AppError.ScoringTimeout::class.java) {
            kotlinx.coroutines.runBlocking {
                spy.measure<Unit>("practice.scoring.completed") { throw AppError.ScoringTimeout }
            }
        }
        val event = spy.records.single() as TelemetrySpy.Record.Event
        assertEquals("practice.scoring.completed.failed", event.name)
        assertEquals("scoring_timeout", event.attributes["error_code"])
    }

    @Test
    fun `reset clears records`() {
        val spy = TelemetrySpy()
        spy.event("library.tab.selected")
        spy.reset()
        assertTrue(spy.records.isEmpty())
    }
}
