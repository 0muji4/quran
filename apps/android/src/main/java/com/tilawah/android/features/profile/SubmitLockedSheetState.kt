package com.tilawah.android.features.profile

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.SheetState
import androidx.compose.material3.SheetValue
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState

/** Sheet state that refuses to hide while [isSubmitting] is true. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun rememberSubmitLockedSheetState(isSubmitting: Boolean): SheetState {
    val submitting by rememberUpdatedState(isSubmitting)
    // ModalBottomSheet starts hiding on back, scrim tap, or drag before it calls
    // onDismissRequest, so ignoring the request there still closes the sheet.
    return rememberModalBottomSheetState(
        skipPartiallyExpanded = true,
        confirmValueChange = { it != SheetValue.Hidden || !submitting },
    )
}
