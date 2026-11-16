package com.tilawah.android.features.library

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.tilawah.android.R
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.AppTheme

/**
 * One surah in the Library list, as a Material 3 list item: the surah's
 * number, its English name with the revelation place, ayah count and best
 * score under it, and its Arabic name at the end. The surah the user left
 * off at ([resume]) carries a bookmark.
 *
 * @param canonicalNumber the surah's 1–114 number, derived from `surah.id`
 *   by the caller (falling back to the list position).
 * @param bestScore the best score out of 100, or null before the first attempt.
 */
@Composable
fun SurahRow(
    canonicalNumber: Int,
    surah: SurahSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    resume: Boolean = false,
    bestScore: Int? = null,
) {
    val meta = if (bestScore != null) {
        stringResource(R.string.library_surah_meta_best, surah.revelationPlace, surah.ayahCount, bestScore)
    } else {
        stringResource(R.string.library_surah_meta, surah.revelationPlace, surah.ayahCount)
    }
    ListItem(
        modifier = modifier.clickable(onClick = onClick),
        leadingContent = {
            Surface(
                modifier = Modifier.size(40.dp),
                shape = CircleShape,
                color = AppTheme.colorScheme.secondaryContainer,
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(text = "%d".format(canonicalNumber), style = AppTheme.typography.labelLarge)
                }
            }
        },
        headlineContent = {
            Row(
                horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space1),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(text = surah.nameEn)
                if (resume) {
                    Icon(
                        imageVector = Icons.Filled.Bookmark,
                        contentDescription = stringResource(R.string.library_resume_a11y),
                        modifier = Modifier.size(14.dp),
                        tint = AppTheme.colorScheme.primary,
                    )
                }
            }
        },
        supportingContent = { Text(text = meta) },
        trailingContent = { SurahNameArabic(name = surah.nameAr) },
    )
}

/** A surah's Arabic name in Amiri, right to left whatever the interface direction. */
@Composable
internal fun SurahNameArabic(name: String, modifier: Modifier = Modifier) {
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Text(
            text = name,
            modifier = modifier,
            style = AppTheme.quranTypography.ayahNumber.copy(fontSize = SURAH_NAME_SIZE),
            color = AppTheme.colorScheme.onSurface,
        )
    }
}

/** Large enough for Amiri's marks to read beside a list item's text. */
private val SURAH_NAME_SIZE = 22.sp
