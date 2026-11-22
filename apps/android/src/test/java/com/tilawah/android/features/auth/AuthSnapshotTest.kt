package com.tilawah.android.features.auth

import androidx.compose.foundation.layout.height
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.tilawah.android.app.AppError
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders sign in and create account in each state, in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class AuthSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun auth() {
        captureSnapshot(composeRule, variant, "auth/${scene.id}_${variant.id}.png") {
            AppTheme {
                val modifier = Modifier.height(scene.height)
                if (scene.signUp) {
                    SignUpContent(
                        state = scene.state,
                        onDisplayNameChange = {},
                        onEmailChange = {},
                        onPasswordChange = {},
                        onLevelChange = {},
                        onAgreedToTermsChange = {},
                        onSubmit = {},
                        onGoogle = {},
                        onSignIn = {},
                        modifier = modifier,
                    )
                } else {
                    SignInContent(
                        state = scene.state,
                        onEmailChange = {},
                        onPasswordChange = {},
                        onSubmit = {},
                        onGoogle = {},
                        onCreateAccount = {},
                        onBack = {},
                        modifier = modifier,
                    )
                }
            }
        }
    }

    data class Scene(
        val id: String,
        val state: AuthUiState,
        val signUp: Boolean = false,
        val height: Dp = PHONE_HEIGHT,
    ) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        /** Tall enough for the whole create-account page, which scrolls on a phone. */
        private val FULL_PAGE = 1300.dp

        private val signIn = AuthUiState(email = "amina@example.com", password = "secret-pass")
        private val signUp = AuthUiState(
            email = "amina@example.com",
            password = "secret-pass-1",
            displayName = "Amina",
            level = Level.Intermediate,
            agreedToTerms = true,
        )

        private val scenes = listOf(
            Scene("signIn", signIn),
            Scene("signInError", signIn.copy(error = AppError.InvalidCredentials)),
            Scene("signInPending", signIn.copy(pending = true)),
            Scene("signUp", signUp, signUp = true, height = FULL_PAGE),
            Scene(
                "signUpTermsError",
                signUp.copy(agreedToTerms = false, termsError = true),
                signUp = true,
                height = FULL_PAGE,
            ),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
