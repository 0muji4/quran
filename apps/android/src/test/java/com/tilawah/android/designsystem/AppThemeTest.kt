package com.tilawah.android.designsystem

import androidx.compose.foundation.shape.RoundedCornerShape
import com.tilawah.android.designsystem.generated.DarkAppColors
import com.tilawah.android.designsystem.generated.DarkColorScheme
import com.tilawah.android.designsystem.generated.LightAppColors
import com.tilawah.android.designsystem.generated.LightColorScheme
import com.tilawah.android.designsystem.generated.TokenShape
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

class AppThemeTest {

    @Test
    fun `light appearance uses the light tokens`() {
        val colors = appThemeColors(darkTheme = false)
        assertSame(LightColorScheme, colors.colorScheme)
        assertSame(LightAppColors, colors.appColors)
    }

    @Test
    fun `dark appearance uses the dark tokens`() {
        val colors = appThemeColors(darkTheme = true)
        assertSame(DarkColorScheme, colors.colorScheme)
        assertSame(DarkAppColors, colors.appColors)
    }

    @Test
    fun `shape scale follows the generated corner radii`() {
        assertEquals(RoundedCornerShape(TokenShape.extraSmall), AppShapes.extraSmall)
        assertEquals(RoundedCornerShape(TokenShape.small), AppShapes.small)
        assertEquals(RoundedCornerShape(TokenShape.medium), AppShapes.medium)
        assertEquals(RoundedCornerShape(TokenShape.large), AppShapes.large)
        assertEquals(RoundedCornerShape(TokenShape.extraLarge), AppShapes.extraLarge)
    }
}
