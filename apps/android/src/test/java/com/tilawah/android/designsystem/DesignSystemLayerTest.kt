package com.tilawah.android.designsystem

import java.io.File
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Enforces the ADR 0026 dependency rule on Android: screens and components
 * read tokens through [AppTheme], so `designsystem.generated` is imported
 * only by the theme binding, and nothing names the old theme the redesign
 * removed (#596).
 */
class DesignSystemLayerTest {

    @Test
    fun `only the theme binding imports the generated tokens`() {
        // Gradle runs unit tests with the module directory as the working
        // directory.
        val sourceRoot = File("src/main/java")
        assertTrue("Main sources not found at ${sourceRoot.absolutePath}", sourceRoot.isDirectory)

        val offenders = sourceRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .map { it.relativeTo(sourceRoot).invariantSeparatorsPath to it }
            .filterNot { (path, _) -> path.startsWith(GENERATED_DIR) || path == THEME_BINDING }
            .filter { (_, file) -> file.readText().contains(GENERATED_PACKAGE) }
            .map { (path, _) -> path }
            .toList()

        assertTrue(
            "Read tokens through AppTheme instead of importing $GENERATED_PACKAGE: $offenders",
            offenders.isEmpty(),
        )
    }

    @Test
    fun `no source names the old theme`() {
        val sourceRoot = File("src/main/java")
        assertTrue("Main sources not found at ${sourceRoot.absolutePath}", sourceRoot.isDirectory)

        val offenders = sourceRoot.walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .filter { OLD_THEME.containsMatchIn(it.readText()) }
            .map { it.relativeTo(sourceRoot).invariantSeparatorsPath }
            .sorted()
            .toList()

        assertTrue(
            "Read the theme through AppTheme and use the App* components, not the old Brand* ones: $offenders",
            offenders.isEmpty(),
        )
    }

    private companion object {
        const val GENERATED_PACKAGE = "com.tilawah.android.designsystem.generated"
        const val GENERATED_DIR = "com/tilawah/android/designsystem/generated/"
        const val THEME_BINDING = "com/tilawah/android/designsystem/AppTheme.kt"

        /** `BrandTheme`, `BrandColors`, `BrandTypography`, `BrandSpacing` and the `Brand*` components. */
        val OLD_THEME = Regex("""\bBrand[A-Z][A-Za-z]*""")
    }
}
