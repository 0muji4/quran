package com.tilawah.android.backend

/**
 * Test double for [PreferencesClient]. [preferencesResult] backs GET;
 * [updateResult] is a per-call closure (the patch matters) backing PATCH.
 * `callLog` and `patches` record what was invoked so ViewModel tests can
 * assert the sequence and the exact patch contents.
 *
 * Mirrors [MockProfileService] (this file's neighbour).
 */
class MockPreferencesClient(
    var preferencesResult: Result<PracticePreferences> = Result.success(PracticePreferences.Default),
    var updateResult: (PracticePreferencesPatch) -> Result<PracticePreferences> = {
        Result.success(PracticePreferences.Default)
    },
) : PreferencesClient {

    val callLog: MutableList<String> = mutableListOf()
    val patches: MutableList<PracticePreferencesPatch> = mutableListOf()

    override suspend fun preferences(): PracticePreferences {
        callLog += "preferences"
        return preferencesResult.getOrThrow()
    }

    override suspend fun updatePreferences(patch: PracticePreferencesPatch): PracticePreferences {
        callLog += "updatePreferences"
        patches += patch
        return updateResult(patch).getOrThrow()
    }
}
