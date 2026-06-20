package com.tilawah.android.features.practice

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
import com.tilawah.android.backend.AyahDetail
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.BrandCard
import com.tilawah.android.designsystem.components.BrandCardStyle
import kotlin.math.cos
import kotlin.math.sin

/**
 * Practice ayah card — a centered, letter-spaced eyebrow ("AYAH N —
 * SURAH"), then a decorative gold star medallion holding the ayah
 * number beside the centered Arabic line. English translation and
 * transliteration (when present) render centered below. Mirrors the
 * Figma exports `docs/design/Android _ Practice *`.
 */
@Composable
fun AyahCard(
    ayah: AyahDetail,
    surahNameEn: String,
    modifier: Modifier = Modifier,
) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    BrandCard(modifier = modifier.fillMaxWidth(), style = BrandCardStyle.Paper) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(spacing.md),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(
                    R.string.practice_ayah_eyebrow,
                    ayah.ayahNumber,
                    surahNameEn.uppercase(),
                ),
                style = typography.eyebrow.copy(letterSpacing = 2.sp),
                color = colors.textSecondary,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(
                    spacing.md,
                    Alignment.CenterHorizontally,
                ),
            ) {
                AyahMedallion(number = ayah.ayahNumber)
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Text(
                        text = ayah.textAr,
                        style = typography.arabicAyah,
                        color = colors.textPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                }
            }
            ayah.textEn?.let { english ->
                Text(
                    text = english,
                    style = typography.body,
                    color = colors.textPrimary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            ayah.transliteration?.let { translit ->
                Text(
                    text = translit,
                    style = typography.caption,
                    color = colors.textSecondary,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

/**
 * Gold eight-point star medallion drawn with [Canvas] (no asset needed)
 * with the ayah number centered inside. Uses [BrandTheme.colors.decorative]
 * for the stroke so it tracks the brand gold.
 */
@Composable
private fun AyahMedallion(number: Int) {
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val starColor = colors.decorative
    Box(
        modifier = Modifier.size(40.dp),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.size(40.dp)) {
            val cx = size.width / 2f
            val cy = size.height / 2f
            val outer = size.minDimension / 2f
            val inner = outer * 0.45f
            val points = 8
            val path = Path()
            for (i in 0 until points * 2) {
                val radius = if (i % 2 == 0) outer else inner
                val angle = Math.PI * i / points - Math.PI / 2
                val x = cx + radius * cos(angle).toFloat()
                val y = cy + radius * sin(angle).toFloat()
                if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
            }
            path.close()
            drawPath(path = path, color = starColor, style = Stroke(width = 1.5.dp.toPx()))
        }
        Text(
            text = number.toString(),
            style = typography.caption.copy(fontSize = 11.sp),
            color = colors.decorative,
            textAlign = TextAlign.Center,
        )
    }
}
