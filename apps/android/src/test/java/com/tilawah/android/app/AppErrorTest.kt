package com.tilawah.android.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class AppErrorTest {

    @Test
    fun `auth errors expose stable telemetry codes`() {
        assertEquals("invalid_credentials", AppError.InvalidCredentials.telemetryCode)
        assertEquals("email_in_use", AppError.EmailInUse.telemetryCode)
        assertEquals(
            "validation_failed",
            AppError.ValidationFailed(reason = "email").telemetryCode,
        )
    }

    @Test
    fun `auth errors map to dedicated string resources`() {
        // The IDs themselves are codegen-derived ints; assert only that
        // each AppError variant resolves to a distinct, non-zero pair.
        val errors = listOf(
            AppError.InvalidCredentials,
            AppError.EmailInUse,
            AppError.ValidationFailed(reason = "password"),
        )
        val titles = errors.map { it.titleRes }
        val recoveries = errors.map { it.recoveryRes }
        assertEquals(errors.size, titles.toSet().size)
        assertEquals(errors.size, recoveries.toSet().size)
        titles.forEach { assertFalse("title res should be non-zero", it == 0) }
        recoveries.forEach { assertFalse("recovery res should be non-zero", it == 0) }
    }

    @Test
    fun `auth errors are not retriable`() {
        // Sign-in / sign-up failures need user action (correct password
        // or different email); a bare button retry is misleading.
        assertFalse(AppError.InvalidCredentials.isRetriable)
        assertFalse(AppError.EmailInUse.isRetriable)
        assertFalse(AppError.ValidationFailed(reason = "email").isRetriable)
    }
}
