package com.tilawah.android.features.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.tilawah.android.app.AppError

/**
 * Wraps Credential Manager's "Sign in with Google" (DD: native Google
 * sign-in, Q4). Given a server-issued nonce, returns the Google ID token,
 * or null if the user dismisses the sheet. `serverClientId` is the web/
 * server OAuth client ID, so the token's `aud` is what the BFF verifies.
 */
class GoogleCredentialClient(
    private val context: Context,
    private val serverClientId: String,
    private val credentialManager: CredentialManager = CredentialManager.create(context),
) {
    suspend fun getIdToken(nonce: String): String? {
        val option = GetGoogleIdOption.Builder()
            .setServerClientId(serverClientId)
            // Show all Google accounts, not only previously-authorized ones,
            // so first-time sign-in works without a separate fallback pass.
            .setFilterByAuthorizedAccounts(false)
            .setNonce(nonce)
            .build()
        val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
        return try {
            val result = credentialManager.getCredential(context, request)
            val credential = result.credential
            if (
                credential is CustomCredential &&
                credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                GoogleIdTokenCredential.createFrom(credential.data).idToken
            } else {
                throw AppError.BackendUnavailable("google")
            }
        } catch (_: GetCredentialCancellationException) {
            null
        } catch (cause: GetCredentialException) {
            throw AppError.BackendUnavailable("google", cause)
        }
    }
}
