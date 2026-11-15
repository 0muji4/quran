import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.apollographql.apollo")
    id("io.github.takahirom.roborazzi")
}

android {
    namespace = "com.tilawah.android"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.tilawah.android"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "1.0"
        // 10.0.2.2 is the Android emulator's alias for the host machine's
        // localhost; physical devices override via the BFF_BASE_URL gradle
        // property or env var.
        val bffBaseUrl =
            (project.findProperty("BFF_BASE_URL") as String?)
                ?: System.getenv("BFF_BASE_URL")
                ?: "http://10.0.2.2:4000"
        buildConfigField("String", "BFF_BASE_URL", "\"$bffBaseUrl\"")

        // Web/server OAuth client ID, passed to Credential Manager as the
        // serverClientId so the Google ID token's aud is the server client
        // ID the BFF verifies. Empty disables the Google button (it falls
        // back to the disabled placeholder).
        val googleServerClientId =
            (project.findProperty("GOOGLE_SERVER_CLIENT_ID") as String?)
                ?: System.getenv("GOOGLE_SERVER_CLIENT_ID")
                ?: ""
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"$googleServerClientId\"")
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    testOptions {
        unitTests {
            // Robolectric renders the screens for the snapshot tests (ADR 0027),
            // which needs the merged resources.
            isIncludeAndroidResources = true
        }
    }
}

roborazzi {
    outputDir.set(file("src/test/snapshots"))
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

apollo {
    service("quran") {
        // Schema sourced from the cross-platform contract; iOS uses the
        // same file via apollo-ios-cli (see apps/ios/Makefile).
        schemaFiles.from(rootProject.file("schemas/graphql/schema.graphql"))
        srcDir("src/main/graphql")
        packageName.set("com.tilawah.android.graphql")
        // The schema declares scalar JSONObject + DateTime; map them to
        // safe Kotlin types instead of letting codegen guess.
        mapScalarToKotlinAny("JSONObject")
        mapScalarToKotlinString("DateTime")
        generateOptionalOperationVariables.set(false)
    }
}

val robolectricAndroidAll: Configuration by configurations.creating {
    isCanBeConsumed = false
    isTransitive = false
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("com.google.android.material:material:1.14.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.12.0")
    implementation("androidx.tracing:tracing-ktx:2.0.5")
    implementation("androidx.datastore:datastore-preferences:1.3.0")
    implementation("com.squareup.okhttp3:okhttp:5.5.1")
    implementation("com.apollographql.apollo:apollo-runtime:5.2.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.1")

    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.11.0")
    testImplementation("app.cash.turbine:turbine:1.2.1")
    testImplementation("com.squareup.okhttp3:mockwebserver:5.5.1")
    testImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    testImplementation("androidx.compose.ui:ui-test-junit4")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.78.0")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // The Android framework jar for SNAPSHOT_SDK (35). The version is the one
    // Robolectric's DefaultSdkProvider names for that SDK, so it changes with
    // the Robolectric version above and with SNAPSHOT_SDK.
    robolectricAndroidAll("org.robolectric:android-all-instrumented:15-robolectric-13954326-i7")
}

// Robolectric runs offline and loads the Android framework jars from this
// directory, so the tests make no network requests of their own and the jars
// come from Gradle's dependency cache like every other dependency. A test that
// asks for an SDK not resolved here fails with the jar name it expected.
val robolectricAndroidAllDir = layout.buildDirectory.dir("robolectric/android-all")

val syncRobolectricAndroidAll by tasks.registering(Sync::class) {
    from(robolectricAndroidAll)
    into(robolectricAndroidAllDir)
}

tasks.withType<Test>().configureEach {
    inputs.files(syncRobolectricAndroidAll)
        .withPropertyName("robolectricAndroidAll")
        .withPathSensitivity(PathSensitivity.NAME_ONLY)
    systemProperty("robolectric.offline", "true")
    systemProperty("robolectric.dependency.dir", robolectricAndroidAllDir.get().asFile.absolutePath)
}
