package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.dp
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

/**
 * Renders the four Profile sheets in each state, in every [RenderVariant]
 * (ADR 0027). Edit profile is a full-screen dialog at a phone's height; the
 * bottom sheets are drawn on the sheet's container colour and shape, without
 * the modal around them.
 */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class ProfileSheetsSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun sheet() {
        captureSnapshot(composeRule, variant, "profile-sheets/${scene.id}_${variant.id}.png") {
            AppTheme { scene.content() }
        }
    }

    class Scene(val id: String, val content: @Composable () -> Unit) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        @Composable
        private fun BottomSheet(content: @Composable () -> Unit) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
                color = AppTheme.colorScheme.surfaceContainerLow,
            ) {
                content()
            }
        }

        private val scenes = listOf(
            Scene("edit") {
                EditProfileScreenContent(
                    state = EditProfileUiState(displayName = "Amina R", level = "intermediate", status = EditProfileStatus.Idle),
                    initialDisplayName = "Amina",
                    initialLevel = "intermediate",
                    onDisplayNameChange = {},
                    onLevelChange = {},
                    onSubmit = {},
                    onCancel = {},
                    modifier = Modifier.height(PHONE_HEIGHT),
                )
            },
            Scene("email") {
                BottomSheet {
                    ChangeEmailSheetContent(
                        state = ChangeEmailUiState("secret-pass", "amina.r@example.com", ChangeEmailStatus.Idle),
                        canSubmit = true,
                        onCurrentPasswordChange = {},
                        onNewEmailChange = {},
                        onSubmit = {},
                        onCancel = {},
                    )
                }
            },
            Scene("emailSaving") {
                BottomSheet {
                    ChangeEmailSheetContent(
                        state = ChangeEmailUiState("secret-pass", "amina.r@example.com", ChangeEmailStatus.Submitting),
                        canSubmit = false,
                        onCurrentPasswordChange = {},
                        onNewEmailChange = {},
                        onSubmit = {},
                        onCancel = {},
                    )
                }
            },
            Scene("passwordError") {
                BottomSheet {
                    UpdatePasswordSheetContent(
                        state = UpdatePasswordUiState(
                            currentPassword = "wrong-pass",
                            newPassword = "new-secret-1",
                            confirmPassword = "new-secret-1",
                            status = UpdatePasswordStatus.Error("Current password is incorrect."),
                        ),
                        canSubmit = true,
                        onCurrentPasswordChange = {},
                        onNewPasswordChange = {},
                        onConfirmPasswordChange = {},
                        onSubmit = {},
                        onCancel = {},
                    )
                }
            },
            Scene("delete") {
                BottomSheet {
                    DeleteAccountSheetContent(
                        state = DeleteAccountUiState(confirmText = "DELETE", status = DeleteAccountStatus.Idle),
                        canSubmit = true,
                        onConfirmTextChange = {},
                        onSubmit = {},
                        onCancel = {},
                    )
                }
            },
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
