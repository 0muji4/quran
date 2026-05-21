package com.tilawah.android.backend

import com.tilawah.android.app.AppError

/**
 * Test double for [ProfileService]. Each method returns a configurable
 * [Result] (per-call closures where the input matters), and records a
 * `callLog` so ViewModel tests can assert what was invoked with which
 * arguments.
 *
 * Mirrors `MockBackend` (this file's neighbour) and
 * `apps/ios/Tests/QuranRecitationAppTests/MockProfileService.swift`.
 */
class MockProfileService(
    var fetchCurrentUserResult: Result<AuthUser> = Result.failure(
        AppError.BackendUnavailable("profile.fetch"),
    ),
    var updateProfileResult: (String?, String?) -> Result<AuthUser> = { _, _ ->
        Result.failure(AppError.BackendUnavailable("profile.update"))
    },
    var updateEmailResult: (String, String) -> Result<AuthUser> = { _, _ ->
        Result.failure(AppError.BackendUnavailable("profile.email"))
    },
    var updatePasswordResult: (String, String) -> Result<Unit> = { _, _ ->
        Result.failure(AppError.BackendUnavailable("profile.password"))
    },
    var deleteAccountResult: Result<Unit> = Result.success(Unit),
) : ProfileService {

    val callLog: MutableList<String> = mutableListOf()

    override suspend fun fetchCurrentUser(): AuthUser {
        callLog += "fetchCurrentUser"
        return fetchCurrentUserResult.getOrThrow()
    }

    override suspend fun updateProfile(displayName: String?, level: String?): AuthUser {
        callLog += "updateProfile($displayName, $level)"
        return updateProfileResult(displayName, level).getOrThrow()
    }

    override suspend fun updateEmail(currentPassword: String, newEmail: String): AuthUser {
        callLog += "updateEmail($newEmail)"
        return updateEmailResult(currentPassword, newEmail).getOrThrow()
    }

    override suspend fun updatePassword(currentPassword: String, newPassword: String) {
        callLog += "updatePassword"
        updatePasswordResult(currentPassword, newPassword).getOrThrow()
    }

    override suspend fun deleteAccount() {
        callLog += "deleteAccount"
        deleteAccountResult.getOrThrow()
    }
}
