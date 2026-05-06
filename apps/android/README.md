# Android

Kotlin / Jetpack Compose recording app. Pulls Surahs and Ayahs through the BFF and uploads recorded audio for scoring. The application module is configured in `apps/android/build.gradle.kts`.

## Prerequisites

- Android Studio + Android SDK (compileSdk 34, Build Tools 34.x)
- JDK 17
- The Gradle Wrapper (`./gradlew`) — no host-level Gradle install required
- `ANDROID_HOME` / `ANDROID_SDK_ROOT` set, with SDK licenses accepted

## Build / Test / Lint

Run from the repository root via the wrapper:

```bash
./gradlew :apps:android:assembleDebug
./gradlew :apps:android:testDebugUnitTest
./gradlew :apps:android:lintDebug
```

## Pointing at the BFF

`BFF_BASE_URL` defaults to `http://localhost:4000`. Override it with a Gradle property or environment variable:

```bash
./gradlew :apps:android:assembleDebug -PBFF_BASE_URL=http://10.0.2.2:4000
# or
BFF_BASE_URL=http://10.0.2.2:4000 ./gradlew :apps:android:assembleDebug
```

| Setup | Recommended URL |
|---|---|
| **Physical device over USB** | Run `adb reverse tcp:4000 tcp:4000` and keep the default `BFF_BASE_URL=http://localhost:4000` |
| **Android Emulator** | `BFF_BASE_URL=http://10.0.2.2:4000` (the host loopback as seen from the emulator) |
| **Another device on the LAN** | `BFF_BASE_URL=http://<host-LAN-IP>:4000` (the IP must also be allowed for cleartext) |

`adb reverse` mappings are dropped on USB disconnect, device reboot, or `adb kill-server`, so re-run the command each time you reconnect.

## Cleartext (HTTP) policy

Cleartext HTTP is disabled by default starting from Android 9 (API 28). This app keeps a `network_security_config.xml` under `src/debug/res/xml/` that **enables cleartext only for `localhost`, `10.0.2.2`, and `127.0.0.1` in debug builds**. Release builds remain strict and reject cleartext entirely.

To allow a LAN IP in debug builds, add the host or IP to the `<domain-config>` block in `src/debug/res/xml/network_security_config.xml`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `CLEARTEXT communication ... not permitted` | Release build, or a domain not in the allow list | Use a debug build targeting `localhost` / `10.0.2.2`, or extend the config |
| `Failed to connect to localhost` | BFF not running, or `adb reverse` not set | `make dev-up` and `adb reverse tcp:4000 tcp:4000` |
| HTTP 502 from the BFF | BFF is up but its upstream (Go backend) is down | Check `docker compose ps`, hit `/api/surahs` directly to isolate |
| Empty Surah / Ayah list | Database is empty | `make db-migrate && make db-seed` |
