plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.hee.inspection"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.hee.inspection"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "1.2"
    }
    // Fixed key so each CI build installs as an update over the last one (CI makes a new debug key every run)
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}
