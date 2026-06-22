package com.tilawah.android.features.library

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.tilawah.android.R
import com.tilawah.android.backend.Difficulty
import com.tilawah.android.backend.SurahSuggestion
import com.tilawah.android.backend.SurahSummary
import com.tilawah.android.designsystem.BrandTheme
import com.tilawah.android.designsystem.components.PrimaryButton

/**
 * Personalised "Suggested for you" card shown on the Library tab when
 * the BFF's `GET /me/suggestions` returns a surah the signed-in user
 * has not just practised. Sits between Continue and the chip filter,
 * mirrors `apps/ios/.../Features/Library/SuggestedCard.swift` and the
 * web `SuggestedCard.tsx`.
 *
 * Resolves the suggested `surahId` against the already-loaded surah
 * list rather than fetching the surah separately. If the id is not
 * present (e.g. server returned an id the client does not know about
 * yet), the card renders nothing.
 */
@Composable
fun SuggestedCard(
    suggestion: SurahSuggestion,
    surahs: List<SurahSummary>,
    onBegin: (SurahSummary) -> Unit,
    modifier: Modifier = Modifier,
) {
    val picked = surahs.firstOrNull { it.id == suggestion.surahId } ?: return
    val colors = BrandTheme.colors
    val typography = BrandTheme.typography
    val spacing = BrandTheme.spacing

    Surface(
        color = colors.paper,
        shape = RoundedCornerShape(spacing.cardCornerRadius),
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, colors.borderDefault),
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(spacing.cardCornerRadius)),
    ) {
        Column(
            modifier = Modifier.padding(spacing.lg),
            verticalArrangement = Arrangement.spacedBy(spacing.md),
        ) {
            Text(
                text = stringResource(R.string.library_suggested_eyebrow),
                style = typography.eyebrow,
                color = colors.accent,
            )
            Text(
                text = picked.nameEn,
                style = typography.sectionTitle.copy(fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
            )
            Text(
                text = stringResource(
                    R.string.library_suggested_meta,
                    picked.ayahCount,
                    difficultyLabel(picked, suggestion.difficulties),
                ),
                style = typography.caption,
                color = colors.textSecondary,
            )
            PrimaryButton(
                label = stringResource(R.string.library_suggested_begin),
                onClick = { onBegin(picked) },
            )
        }
    }
}

/**
 * Resolves the per-surah difficulty label. Prefers the BFF's per-user
 * signal when present; otherwise falls back to the ayah-count
 * heuristic so the UI is never blank. Matches the web
 * `difficultyOf` helper.
 */
internal fun difficultyLabel(
    surah: SurahSummary,
    difficulties: Map<String, Difficulty>,
): String {
    val bff = difficulties[surah.id]
    return (bff ?: heuristicDifficulty(surah)).label
}

private fun heuristicDifficulty(surah: SurahSummary): Difficulty = when {
    surah.ayahCount <= 10 -> Difficulty.Easy
    surah.ayahCount <= 30 -> Difficulty.Medium
    else -> Difficulty.Hard
}

private val Difficulty.label: String
    get() = when (this) {
        Difficulty.Easy -> "Easy"
        Difficulty.Medium -> "Medium"
        Difficulty.Hard -> "Hard"
    }
