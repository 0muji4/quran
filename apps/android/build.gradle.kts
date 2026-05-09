plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.apollographql.apollo")
    kotlin("plugin.serialization") version "2.0.21"
}

android {
    namespace = "tv.every.tilawah.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "tv.every.tilawah.android"
        minSdk = 26
        targetSdk = 34
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

    kotlinOptions {
        jvmTarget = "17"
    }
}

apollo {
    service("quran") {
        // Schema sourced from the cross-platform contract; iOS uses the
        // same file via apollo-ios-cli (see apps/ios/Makefile).
        schemaFiles.from(rootProject.file("schemas/graphql/schema.graphql"))
        srcDir("src/main/graphql")
        packageName.set("tv.every.tilawah.android.graphql")
        // The schema declares scalar JSONObject + DateTime; map them to
        // safe Kotlin types instead of letting codegen guess.
        mapScalarToKotlinAny("JSONObject")
        mapScalarToKotlinString("DateTime")
        generateOptionalOperationVariables.set(false)
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")
    implementation("androidx.tracing:tracing-ktx:1.2.0")
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.apollographql.apollo:apollo-runtime:4.0.0")

    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.8.1")
    testImplementation("app.cash.turbine:turbine:1.1.0")
}
