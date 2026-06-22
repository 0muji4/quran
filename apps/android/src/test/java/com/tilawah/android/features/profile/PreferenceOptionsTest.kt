package com.tilawah.android.features.profile

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class PreferenceOptionsTest {

    @Test
    fun `ReminderClock parses a valid time`() {
        assertEquals(7 to 30, ReminderClock.parse("07:30"))
        assertEquals(0 to 0, ReminderClock.parse("00:00"))
        assertEquals(23 to 59, ReminderClock.parse("23:59"))
    }

    @Test
    fun `ReminderClock falls back to 08-00 on malformed input`() {
        assertEquals(8 to 0, ReminderClock.parse("nonsense"))
        assertEquals(8 to 0, ReminderClock.parse("24:00")) // hour out of range
        assertEquals(8 to 0, ReminderClock.parse("07:60")) // minute out of range
        assertEquals(8 to 0, ReminderClock.parse("7"))
    }

    @Test
    fun `ReminderClock formats zero-padded`() {
        assertEquals("07:30", ReminderClock.format(7, 30))
        assertEquals("08:00", ReminderClock.format(8, 0))
        assertEquals("23:05", ReminderClock.format(23, 5))
    }

    @Test
    fun `ReminderClock parse then format round-trips`() {
        val (h, m) = ReminderClock.parse("06:45")
        assertEquals("06:45", ReminderClock.format(h, m))
    }

    @Test
    fun `ReminderClock displays a 12-hour label`() {
        assertEquals("8:00 AM", ReminderClock.displayLabel("08:00"))
        assertEquals("12:00 AM", ReminderClock.displayLabel("00:00"))
        assertEquals("12:00 PM", ReminderClock.displayLabel("12:00"))
        assertEquals("1:05 PM", ReminderClock.displayLabel("13:05"))
    }

    @Test
    fun `PlaybackSpeedOption trims trailing zeros`() {
        assertEquals("1×", PlaybackSpeedOption.label(1.0))
        assertEquals("2×", PlaybackSpeedOption.label(2.0))
        assertEquals("0.75×", PlaybackSpeedOption.label(0.75))
        assertEquals("1.5×", PlaybackSpeedOption.label(1.5))
        assertEquals("1.25×", PlaybackSpeedOption.label(1.25))
    }

    @Test
    fun `PlaybackSpeedOption steps stay within the BFF bounds`() {
        assertTrue(PlaybackSpeedOption.All.all { it in 0.5..2.0 })
    }

    @Test
    fun `ReciterOption resolves a known id and falls back for an unknown one`() {
        assertEquals("husary-muallim", ReciterOption.forId("husary-muallim").id)
        assertEquals(ReciterOption.All.first(), ReciterOption.forId("not-a-reciter"))
    }
}
