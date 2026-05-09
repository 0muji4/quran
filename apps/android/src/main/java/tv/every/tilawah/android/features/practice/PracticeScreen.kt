package tv.every.tilawah.android.features.practice

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import tv.every.tilawah.android.R
import tv.every.tilawah.android.designsystem.BrandTheme

/**
 * Practice tab — top half scaffold (back button + progress dots +
 * AyahCard). Recording / Teacher reference / Analysing / Result
 * panels arrive in PRs 13–16. Mirrors
 * `apps/ios/.../Features/Practice/PracticeView.swift`.
 */
@Composable
fun PracticeScreen(
    viewModel: PracticeViewModel,
    surahNameEn: String,
    surahAyahCount: Int,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val ayah by viewModel.ayah.collectAsStateWithLifecycle()
    val spacing = BrandTheme.spacing

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = spacing.screenHorizontal, vertical = spacing.lg),
        verticalArrangement = Arrangement.spacedBy(spacing.lg),
    ) {
        Header(
            surahNameEn = surahNameEn,
            currentAyah = ayah?.ayahNumber,
            ayahCount = surahAyahCount,
            onNavigateBack = onNavigateBack,
        )
        ProgressDots(currentAyah = ayah?.ayahNumber, ayahCount = surahAyahCount)
        ayah?.let { AyahCard(it) }
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = when (state) {
                    PracticeState.Idle -> stringResource(R.string.practice_idle_hint)
                    else -> ""
                },
                style = BrandTheme.typography.caption,
                color = BrandTheme.colors.textSecondary,
            )
        }
    }
}

@Composable
private fun Header(
    surahNameEn: String,
    currentAyah: Int?,
    ayahCount: Int,
    onNavigateBack: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.md),
    ) {
        IconButton(onClick = onNavigateBack) {
            Icon(
                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                contentDescription = stringResource(R.string.practice_back_a11y),
            )
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = surahNameEn,
                style = BrandTheme.typography.sectionTitle,
                color = BrandTheme.colors.textPrimary,
            )
            Text(
                text = stringResource(
                    R.string.practice_ayah_progress,
                    currentAyah ?: 1,
                    ayahCount,
                ),
                style = BrandTheme.typography.caption,
                color = BrandTheme.colors.textSecondary,
            )
        }
    }
}

@Composable
private fun ProgressDots(currentAyah: Int?, ayahCount: Int) {
    if (ayahCount <= 1) return
    val active = currentAyah ?: 1
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(BrandTheme.spacing.xs),
    ) {
        for (i in 1..ayahCount.coerceAtMost(MAX_DOTS)) {
            Box(
                modifier = Modifier
                    .size(6.dp)
                    .clip(CircleShape)
                    .background(
                        if (i == active) BrandTheme.colors.primary else BrandTheme.colors.tile,
                    ),
            )
        }
    }
}

private const val MAX_DOTS = 30
