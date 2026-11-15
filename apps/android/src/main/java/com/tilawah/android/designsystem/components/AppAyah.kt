package com.tilawah.android.designsystem.components

import android.content.res.Configuration
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import com.tilawah.android.designsystem.AppTheme

/** [number] in Arabic-Indic digits (٠ to ٩), whatever the device locale. */
fun arabicIndicDigits(number: Int): String =
    number.toString().map { if (it in '0'..'9') ARABIC_INDIC_ZERO + (it - '0') else it }.joinToString("")

/**
 * An ayah number in Arabic-Indic digits inside an ornament ring, 40dp tall
 * and wider for three digits. [contentDescription], such as "Ayah 255",
 * replaces the digits for screen readers.
 */
@Composable
fun AppAyahNumber(
    number: Int,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .widthIn(min = AYAH_NUMBER_SIZE)
            .heightIn(min = AYAH_NUMBER_SIZE)
            .border(AYAH_NUMBER_RING_WIDTH, AppTheme.appColors.ornament, CircleShape)
            .padding(horizontal = AppTheme.spacing.space2)
            .clearAndSetSemantics { this.contentDescription = contentDescription },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = arabicIndicDigits(number),
            style = AppTheme.quranTypography.ayahNumber,
            color = AppTheme.colorScheme.onSurface,
        )
    }
}

/**
 * The Arabic text of an ayah, centred and right to left whatever the UI
 * direction. Set [long] for an ayah too long for the regular size, such as
 * 2:255.
 */
@Composable
fun AppAyahText(
    text: String,
    modifier: Modifier = Modifier,
    long: Boolean = false,
) {
    val quran = AppTheme.quranTypography
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Text(
            text = text,
            modifier = modifier.fillMaxWidth(),
            style = (if (long) quran.ayahLong else quran.ayah).copy(
                lineHeight = AYAH_LINE_HEIGHT,
                textDirection = TextDirection.Rtl,
                textAlign = TextAlign.Center,
            ),
            color = AppTheme.colorScheme.onSurface,
        )
    }
}

/** The transliteration, in italics, and the translation of an ayah, centred. */
@Composable
fun AppAyahGloss(
    transliteration: String,
    translation: String,
    modifier: Modifier = Modifier,
) {
    val style = AppTheme.typography.bodyMedium
    val color = AppTheme.colorScheme.onSurfaceVariant
    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1)) {
        Text(
            text = transliteration,
            modifier = Modifier.fillMaxWidth(),
            style = style.copy(fontStyle = FontStyle.Italic),
            color = color,
            textAlign = TextAlign.Center,
        )
        Text(
            text = translation,
            modifier = Modifier.fillMaxWidth(),
            style = style,
            color = color,
            textAlign = TextAlign.Center,
        )
    }
}

private const val ARABIC_INDIC_ZERO = '٠'
private val AYAH_NUMBER_SIZE = 40.dp
private val AYAH_NUMBER_RING_WIDTH = 1.5.dp
private val AYAH_LINE_HEIGHT = 1.9.em

/** A short ayah with its gloss and a long ayah, for previews and snapshot tests. */
@Composable
internal fun AppAyahSpecimen() {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        AppAyahNumber(number = 1, contentDescription = "Ayah 1", modifier = Modifier.align(Alignment.CenterHorizontally))
        AppAyahText(text = "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ")
        AppAyahGloss(
            transliteration = "Bismillāhi r-raḥmāni r-raḥīm",
            translation = "In the name of God, the Most Gracious, the Most Merciful.",
        )
    }
    AppCard(modifier = Modifier.fillMaxWidth()) {
        AppAyahNumber(
            number = 255,
            contentDescription = "Ayah 255",
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
        AppAyahText(
            text = "ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُۚ لَا تَأۡخُذُهُۥ سِنَةٞ وَلَا نَوۡمٞۚ " +
                "لَّهُۥ مَا فِي ٱلسَّمَٰوَٰتِ وَمَا فِي ٱلۡأَرۡضِۗ",
            long = true,
        )
    }
}

@Preview(name = "Light")
@Preview(name = "Dark", uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun AppAyahPreview() {
    AppSpecimenSurface { AppAyahSpecimen() }
}
