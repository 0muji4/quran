package com.tilawah.android.features.practice

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Locks the shared cross-platform progress threshold. The same boundary
 * (≤ 12 → segmented, > 12 → continuous bar) ships on iOS and web, so a
 * surah renders the same indicator on every platform; this guards against
 * silent drift.
 */
class PracticeProgressTests {

    @Test
    fun `short surahs use segmented progress`() {
        assertTrue(usesSegmentedProgress(1))
        assertTrue(usesSegmentedProgress(7))
    }

    @Test
    fun `the boundary is inclusive at twelve`() {
        assertEquals(12, MAX_SEGMENTS)
        assertTrue(usesSegmentedProgress(12))
        assertFalse(usesSegmentedProgress(13))
    }

    @Test
    fun `long surahs use the continuous bar`() {
        assertFalse(usesSegmentedProgress(286))
    }
}
