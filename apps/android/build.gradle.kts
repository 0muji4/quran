plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.quranproject.android"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.quranproject.android"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
        val bffBaseUrl =
            (project.findProperty("BFF_BASE_URL") as String?)
                ?: System.getenv("BFF_BASE_URL")
                ?: "http://localhost:4000"
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

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.06.00"))
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-compose:1.9.1")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
}
