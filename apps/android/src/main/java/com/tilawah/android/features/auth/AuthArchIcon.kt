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
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Stylised arch + star drawn over a square canvas. Used as the hero
 * mark above "Welcome back" on the sign-in screen. Renders the two
 * brand arches in gold, a gold eight-point sunburst centred inside the
 * inner arch, and a single 4-point star at the apex.
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
        // Concentric inner arch, inset from the outer so the two run
        // parallel (the mock's nested arches, not a narrow doorway).
        val inner = Path().apply {
            moveTo(w * 0.31f, h * 0.85f)
            lineTo(w * 0.31f, h * 0.50f)
            quadraticBezierTo(w * 0.50f, h * 0.18f, w * 0.69f, h * 0.50f)
            lineTo(w * 0.69f, h * 0.85f)
        }
        drawPath(outer, color = colors.accent, style = stroke)
        drawPath(inner, color = colors.accent, style = stroke)

        // Gold eight-point sunburst centred inside the inner arch — the
        // doorway's focal mark. Sixteen vertices alternating between the
        // outer tip radius and the inner valley radius.
        val burstCx = w * 0.50f
        val burstCy = h * 0.62f
        val burstOuter = w * 0.085f
        val burstInner = burstOuter * 0.42f
        val burst = Path().apply {
            val tips = 8
            for (i in 0 until tips * 2) {
                val radius = if (i % 2 == 0) burstOuter else burstInner
                val theta = (PI / tips * i - PI / 2).toFloat()
                val px = burstCx + radius * cos(theta)
                val py = burstCy + radius * sin(theta)
                if (i == 0) moveTo(px, py) else lineTo(px, py)
            }
            close()
        }
        drawPath(burst, color = colors.accent)

        // Four-point star at the apex, top-centre of the arch.
        val cx = w * 0.50f
        val cy = h * 0.10f
        val r = w * 0.055f
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
