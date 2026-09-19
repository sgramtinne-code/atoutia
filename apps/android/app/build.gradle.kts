plugins {
    id("com.android.application")

    id("org.jetbrains.kotlin.plugin.compose")
}

fun String.asBuildConfigString():
    String =
    "\"${
        replace(
            "\\",
            "\\\\",
        ).replace(
            "\"",
            "\\\"",
        )
    }\""

val atoutiaGoogleClientId =
    providers
        .gradleProperty(
            "ATOUTIA_GOOGLE_CLIENT_ID",
        )
        .orElse(
            providers.environmentVariable(
                "ATOUTIA_GOOGLE_CLIENT_ID",
            ),
        )
        .orElse(
            "",
        )
        .get()

android {
    namespace =
        "tech.devoo.atoutia"

    compileSdk =
        37

    defaultConfig {
        applicationId =
            "tech.devoo.atoutia"

        minSdk =
            26

        targetSdk =
            36

        versionCode =
            1

        versionName =
            "0.1.0"

        testInstrumentationRunner =
            "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        debug {
            buildConfigField(
                "String",
                "ATOUTIA_API_BASE_URL",
                "\"http://127.0.0.1:3000\"",
            )

            buildConfigField(
                "String",
                "ATOUTIA_GOOGLE_CLIENT_ID",
                atoutiaGoogleClientId
                    .asBuildConfigString(),
            )
        }

        release {
            isMinifyEnabled =
                false

            buildConfigField(
                "String",
                "ATOUTIA_API_BASE_URL",
                "\"\"",
            )

            buildConfigField(
                "String",
                "ATOUTIA_GOOGLE_CLIENT_ID",
                atoutiaGoogleClientId
                    .asBuildConfigString(),
            )

            proguardFiles(
                getDefaultProguardFile(
                    "proguard-android-optimize.txt",
                ),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility =
            JavaVersion.VERSION_17

        targetCompatibility =
            JavaVersion.VERSION_17
    }

    buildFeatures {
        buildConfig =
            true

        compose =
            true
    }
}

dependencies {
    val composeBom =
        platform(
            "androidx.compose:compose-bom:2026.08.00",
        )

    implementation(
        composeBom,
    )

    androidTestImplementation(
        composeBom,
    )

    implementation(
        "androidx.activity:activity-compose:1.13.0",
    )

    implementation(
        "androidx.lifecycle:lifecycle-runtime-ktx:2.11.0",
    )

    implementation(
        "androidx.compose.material3:material3",
    )

    implementation(
        "androidx.compose.ui:ui",
    )

    implementation(
        "androidx.compose.ui:ui-tooling-preview",
    )

    implementation(
        "androidx.credentials:credentials:1.6.0",
    )

    implementation(
        "androidx.credentials:credentials-play-services-auth:1.6.0",
    )

    implementation(
        "com.google.android.libraries.identity.googleid:googleid:1.2.1",
    )

    implementation(
        "com.squareup.okhttp3:okhttp:5.1.0",
    )

    debugImplementation(
        "androidx.compose.ui:ui-tooling",
    )

    testImplementation(
        "junit:junit:4.13.2",
    )

    testImplementation(
        "org.json:json:20260814",
    )

    androidTestImplementation(
        "androidx.test.ext:junit:1.3.0",
    )

    androidTestImplementation(
        "androidx.test.espresso:espresso-core:3.7.0",
    )

    androidTestImplementation(
        "androidx.compose.ui:ui-test-junit4",
    )

    debugImplementation(
        "androidx.compose.ui:ui-test-manifest",
    )
}