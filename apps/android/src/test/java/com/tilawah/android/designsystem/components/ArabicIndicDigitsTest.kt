package com.tilawah.android.designsystem.components

import org.junit.Assert.assertEquals
import org.junit.Test

class ArabicIndicDigitsTest {
    @Test
    fun `writes each digit in Arabic-Indic digits`() {
        assertEquals("٠", arabicIndicDigits(0))
        assertEquals("٧", arabicIndicDigits(7))
        assertEquals("٢٥٥", arabicIndicDigits(255))
        assertEquals("٢٨٦", arabicIndicDigits(286))
    }
}
