package com.tilawah.android.features.practice

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import com.tilawah.android.R
import com.tilawah.android.backend.AyahDetail
import com.tilawah.android.designsystem.components.AppAyahGloss
import com.tilawah.android.designsystem.components.AppAyahNumber
import com.tilawah.android.designsystem.components.AppAyahText
import com.tilawah.android.designsystem.components.AppCard

/**
 * The ayah to recite: its number in the ornament ring, the Arabic text, and
 * the transliteration and translation when the ayah has them. An ayah longer
 * than [LONG_AYAH_LENGTH] characters, such as 2:255, uses the smaller Quran
 * style.
 */
@Composable
fun AyahCard(
    ayah: AyahDetail,
    surahNameEn: String,
    modifier: Modifier = Modifier,
) {
    AppCard(modifier = modifier.fillMaxWidth()) {
        AppAyahNumber(
            number = ayah.ayahNumber,
            contentDescription = stringResource(R.string.practice_ayah_eyebrow, ayah.ayahNumber, surahNameEn),
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
        AppAyahText(text = ayah.textAr, long = ayah.textAr.length > LONG_AYAH_LENGTH)
        AppAyahGloss(transliteration = ayah.transliteration, translation = ayah.textEn)
    }
}

/**
 * Above this many characters (diacritics included), an ayah takes the long
 * Quran style. In the snapshot tests' text, 1:2 has 37 and 2:255 has 422.
 */
internal const val LONG_AYAH_LENGTH = 120
