package com.tilawah.android.features.result

import org.junit.Assert.assertEquals
import org.junit.Test

class VerdictBandTest {

    @Test
    fun `null score is awaiting`() {
        assertEquals(VerdictBand.Awaiting, verdictBandForScore(null))
    }

    @Test
    fun `90 and above is mastered`() {
        assertEquals(VerdictBand.Mastered, verdictBandForScore(90))
        assertEquals(VerdictBand.Mastered, verdictBandForScore(100))
    }

    @Test
    fun `70 to 89 is great`() {
        assertEquals(VerdictBand.Great, verdictBandForScore(70))
        assertEquals(VerdictBand.Great, verdictBandForScore(89))
    }

    @Test
    fun `40 to 69 is midway`() {
        assertEquals(VerdictBand.Midway, verdictBandForScore(40))
        assertEquals(VerdictBand.Midway, verdictBandForScore(69))
    }

    @Test
    fun `below 40 is beginner`() {
        assertEquals(VerdictBand.Beginner, verdictBandForScore(39))
        assertEquals(VerdictBand.Beginner, verdictBandForScore(0))
    }
}
