package com.tilawah.android.features.profile

import androidx.compose.foundation.layout.height
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.tilawah.android.backend.PracticePreferences
import com.tilawah.android.designsystem.AppTheme
import com.tilawah.android.snapshot.RenderVariant
import com.tilawah.android.snapshot.SNAPSHOT_DEVICE
import com.tilawah.android.snapshot.SNAPSHOT_SDK
import com.tilawah.android.snapshot.captureSnapshot
import com.tilawah.android.storage.StoredAuthUser
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Renders the Profile tab in each state, in every [RenderVariant] (ADR 0027). */
@RunWith(ParameterizedRobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [SNAPSHOT_SDK], qualifiers = SNAPSHOT_DEVICE)
class ProfileContentSnapshotTest(
    private val scene: Scene,
    private val variant: RenderVariant,
) {
    @get:Rule
    val composeRule = createEmptyComposeRule()

    @Test
    fun profile() {
        captureSnapshot(composeRule, variant, "profile/${scene.id}_${variant.id}.png") {
            AppTheme {
                ProfileContent(
                    user = scene.user,
                    preferences = scene.preferences,
                    preferencesError = null,
                    streakDays = 5,
                    showReactivationBanner = scene.banner,
                    actions = ProfileActions(),
                    modifier = Modifier.height(scene.height),
                )
            }
        }
    }

    data class Scene(
        val id: String,
        val user: StoredAuthUser?,
        val preferences: PracticePreferences = PracticePreferences.Default,
        val banner: Boolean = false,
        val height: Dp = PHONE_HEIGHT,
    ) {
        override fun toString(): String = id
    }

    companion object {
        /** The height of a phone at the snapshot window's width (411dp). */
        private val PHONE_HEIGHT = 891.dp

        /** Tall enough for the whole signed-in page, which scrolls on a phone. */
        private val FULL_PAGE = 1500.dp

        private val amina = StoredAuthUser(
            id = "user-1",
            email = "amina@example.com",
            displayName = "Amina",
            createdAt = "2026-03-01T09:00:00Z",
            level = "intermediate",
            passwordChangedAt = "2026-11-02T10:00:00Z",
        )

        private val scenes = listOf(
            Scene("signedIn", amina, height = FULL_PAGE),
            Scene(
                "reminderOn",
                amina,
                preferences = PracticePreferences.Default.copy(dailyReminderEnabled = true, dailyReminderTime = "08:00"),
                height = FULL_PAGE,
            ),
            Scene("welcomeBack", amina, banner = true),
            Scene("signedOut", null),
        )

        @JvmStatic
        @ParameterizedRobolectricTestRunner.Parameters(name = "{0}_{1}")
        fun parameters(): List<Array<Any>> =
            scenes.flatMap { scene -> RenderVariant.all.map { arrayOf(scene, it) } }
    }
}
