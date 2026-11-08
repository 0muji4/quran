plugins {
    id("com.android.application") version "9.5.1" apply false
    // AGP compiles Kotlin itself and depends on KGP 2.2.10. These plugins
    // depend on KGP at their own version, which raises it to 2.4.21.
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.21" apply false
    id("org.jetbrains.kotlin.plugin.serialization") version "2.4.21" apply false
    id("com.apollographql.apollo") version "4.4.4" apply false
}

allprojects {
    if (!tasks.names.contains("prepareKotlinBuildScriptModel")) {
        tasks.register("prepareKotlinBuildScriptModel")
    }
}
