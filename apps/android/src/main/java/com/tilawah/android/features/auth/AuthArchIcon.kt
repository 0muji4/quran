package com.tilawah.android.features.auth

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.tilawah.android.designsystem.BrandTheme

/**
 * Stylised arch + star drawn over a square canvas. Used as the hero
 * mark above "Welcome back" on the sign-in screen. Renders in two
 * brand strokes (outer arch + inner arch) and a single 4-point star.
 *
 * Vector-only (no resource asset) so the same composable can scale to
 * any size without an extra `xxxhdpi` PNG pass.
 */
@Composable
fun AuthArchIcon(modifier: Modifier = Modifier) {
    val colors = BrandTheme.colors
    Canvas(modifier = modifier.size(96.dp)) {
        val w = size.width
        val h = size.height
        val stroke = Stroke(width = w * 0.025f)
        val outer = Path().apply {
            moveTo(w * 0.20f, h * 0.85f)
            lineTo(w * 0.20f, h * 0.45f)
            quadraticBezierTo(w * 0.50f, h * 0.05f, w * 0.80f, h * 0.45f)
            lineTo(w * 0.80f, h * 0.85f)
        }
        val inner = Path().apply {
            moveTo(w * 0.42f, h * 0.85f)
            lineTo(w * 0.42f, h * 0.62f)
            quadraticBezierTo(w * 0.50f, h * 0.40f, w * 0.58f, h * 0.62f)
            lineTo(w * 0.58f, h * 0.85f)
        }
        drawPath(outer, color = colors.accent, style = stroke)
        drawPath(inner, color = colors.accent, style = stroke)

        // Four-point star at the top-right of the arch.
        val cx = w * 0.78f
        val cy = h * 0.12f
        val r = w * 0.05f
        val star = Path().apply {
            moveTo(cx, cy - r)
            lineTo(cx + r * 0.4f, cy - r * 0.4f)
            lineTo(cx + r, cy)
            lineTo(cx + r * 0.4f, cy + r * 0.4f)
            lineTo(cx, cy + r)
            lineTo(cx - r * 0.4f, cy + r * 0.4f)
            lineTo(cx - r, cy)
            lineTo(cx - r * 0.4f, cy - r * 0.4f)
            close()
        }
        drawPath(star, color = colors.accent)
        drawCircle(color = colors.accent, radius = r * 0.15f, center = Offset(cx, cy))
    }
}
