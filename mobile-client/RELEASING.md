# Releasing the Mobile Client — APK · Google Play · App Store

How to produce an installable build of the mobile client and get it in front of users.

> **How to read this document.** Steps involving this repository's actual files carry a
> **Verified** box and name the file and line they were checked against. Everything else is a
> *reference* step taken from the official Expo, Google, and Apple documentation — those have
> **not** been exercised from this repository: there is no linked EAS project, no Google service
> account, and no Apple Developer account. Treat them as a checklist, not as tested procedure.

---

## 1. Three different things called "release"

| Target | Artifact | Installed by | Signing | Ready today? |
| ------ | -------- | ------------ | ------- | ------------ |
| Sideload / internal share | `.apk` | `adb install`, file transfer, QR link | debug keystore (fine) | **Yes** — see §3 |
| Google Play | `.aab` (Android App Bundle) | Play Store only | upload keystore (required) | No — §4 blockers |
| Apple App Store | `.ipa` | App Store / TestFlight | distribution certificate | No — §5 blockers |

Play Store and App Store accept **only** their own formats. An `.apk` cannot be uploaded to Play,
and an `.aab` cannot be installed directly on a device.

---

## 2. Shared prerequisites

### 2.1 Toolchain

| Requirement | Value on this machine |
| ----------- | --------------------- |
| JDK | `JAVA_HOME` = Adoptium **JDK 17** — Gradle needs 17 |
| Android SDK | `ANDROID_HOME` = `C:\Users\bened\AppData\Local\Android\Sdk` |
| Platform tools | `%ANDROID_HOME%\platform-tools\adb.exe` |
| Build tools | `%ANDROID_HOME%\build-tools\<ver>\aapt2.exe` |
| Expo SDK | 57 (`expo ~57.0.28`, React Native 0.86.3) |

> The `java` first on `PATH` may be older than 17 (an Oracle `javapath` shim). Gradle reads
> `JAVA_HOME`, so builds are unaffected — but do not rely on a bare `java -version` to check.

### 2.2 The API base URL

`EXPO_PUBLIC_API_BASE_URL` from `mobile-client/.env.local` is **inlined into the JS bundle when the
build runs** — it is baked in, not read at runtime. Two consequences:

- Set it **before** you build. Editing it after the fact has no effect on an existing APK.
- `.env*.local` is gitignored (`.gitignore:34`), so the file is **not** uploaded by EAS Build. A
  cloud build without an explicit `env` block in `eas.json` falls back to the code default, which
  on Android is `http://10.0.2.2:8040/api/v1` — emulator loopback, useless on a real phone.

**The embedded value is only a suggestion, not a hard-coded server.** The app forces a server
choice on first run:

> **Verified** — `src/app/(app)/_layout.tsx:30` redirects to `/connect-server` whenever
> `!configured`, and `configured` comes only from SecureStore via
> `src/contexts/ServerConfigContext.tsx` — never from the env var. `DEFAULT_SERVER_URL`
> (`src/services/serverConfig.ts:30`) is documented as the "suggested default" that pre-fills the
> Connect screen, and `normalizeServerUrl` accepts a bare host, adding `http://` and `/api/v1`.

So a shipped APK can be pointed at any server at runtime without rebuilding. Choose the embedded
value for a sensible prefill, not for correctness — but **do** set it, so users are not greeted by
`10.0.2.2`.

### 2.3 Versioning

`eas.json` sets `"appVersionSource": "local"`, so version numbers live in `app.json`:

- `android.versionCode` — integer, must increase for every Play release. **Currently absent from
  `app.json`**; the generated `android/app/build.gradle` carries `versionCode 1`.
- `ios.buildNumber` — string, must increase for every App Store upload. Also absent.
- `version` (`1.0.0`) — the user-facing version.

Because `android/` and `ios/` are regenerated from `app.json`, set `versionCode`/`buildNumber` in
`app.json` so they survive the next prebuild rather than being edited in the generated tree.

---

## 3. Android APK — local Gradle (sideload)

The primary path for an APK you install yourself or hand to a user.

> **Verified** — these preconditions hold in this repository, so the build needs no native
> reconfiguration:
>
> - `android/` exists and is generated (gitignored at `.gitignore:41` — Continuous Native
>   Generation, never edit it by hand).
> - Cleartext HTTP is already permitted: `android/app/src/main/AndroidManifest.xml:22` contains
>   `android:usesCleartextTraffic="true"`, injected by the `expo-build-properties` plugin in
>   `app.json`.
> - The **release** build type is signed: `android/app/build.gradle:112-115` sets
>   `release { signingConfig signingConfigs.debug }`, so `assembleRelease` emits a signed,
>   installable APK with no extra keystore work.
> - `applicationId 'com.inventorymanager.mobile'`, `versionCode 1`, `versionName "1.0.0"`.
> - `release/` is the intended, gitignored output directory (`.gitignore:44`).

```powershell
cd D:\inv\mobile-client

# 1. (Optional) set the server URL that will ship as the Connect-screen prefill.
notepad .env.local

# 2. Do NOT run `npx expo prebuild` here — see the warning below.

# 3. Build the release APK
cd android
.\gradlew.bat assembleRelease "-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"
#   -> android\app\build\outputs\apk\release\app-release.apk

# 4. Confirm the cleartext opt-in survived into the artifact
$aapt2 = Get-ChildItem "$env:ANDROID_HOME\build-tools\*\aapt2.exe" | Select-Object -Last 1
& $aapt2.FullName dump xmltree --file AndroidManifest.xml `
  app\build\outputs\apk\release\app-release.apk | Select-String usesCleartextTraffic

# 5. Publish to the gitignored output directory
copy app\build\outputs\apk\release\app-release.apk ..\release\app-release.apk
```

Install it:

```powershell
# Pin the serial when wireless ADB enumerates the same device twice.
$env:ANDROID_SERIAL = '<serial-from-adb-devices>'
& "$env:ANDROID_HOME\platform-tools\adb.exe" install -r D:\inv\mobile-client\release\app-release.apk
```

### Alternative: EAS cloud build (no local toolchain)

The `preview` profile in `eas.json` sets `distribution: "internal"`, and Expo emits an installable
`.apk` — not a `.aab` — for that setting:

```powershell
npx eas-cli@latest build --platform android --profile preview   # -> .apk download link
```

No JDK, Android SDK, or CMake needed, and it sidesteps the path-length failure below entirely. The
§2.2 caveat still applies: `.env.local` is not uploaded, so supply the API URL via an `env` block in
the profile if you want a non-default prefill.

### Notes that will cost you an hour each if ignored

> **Do not run `npx expo prebuild`.** On SDK 57 it clears `android/` first (it prints
> `- Clearing android`), deleting `android/app/build` and `.cxx`, so the next build recompiles
> every native module — roughly an hour instead of minutes on a warm cache. Re-run it only when
> native configuration genuinely changes.

> **Freeze the comma.** In PowerShell a bare comma is parsed as an array token and Gradle fails
> with *"Missing argument in parameter list"*. Quote the whole argument:
> `"-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"`.

> **Pick ABIs deliberately.** Every ABI is a separate native compile. Check the device with
> `adb shell getprop ro.product.cpu.abilist` — the target device reports
> `arm64-v8a,armeabi-v7a,armeabi`, so the two flags above cover it and skip the emulator ABIs.
> The prebuilt dependencies ship `arm64-v8a` and `armeabi-v7a`.

> **Build from a short path if CMake complains.** Gradle evaluates native modules at the real path
> of `node_modules`, so the repository's absolute path determines object-file path length. When
> that plus CMake's mangled filename exceeds `CMAKE_OBJECT_PATH_MAX` (250), `react-native-screens`
> and `react-native-worklets` fail with
> `ninja: error: manifest 'build.ninja' still dirty after 100 tries`. Work around it by building
> from a short root, e.g. copy `mobile-client` to `D:\mc`. Keep `node_modules` in sync in the copy
> — the build evaluates the Expo config, so any plugin named in `app.json` must also be installed
> there.

> **This APK is signed with the debug keystore** (`android/app/debug.keystore`, alias
> `androiddebugkey`, password `android`). That is fine for sideloading, and unacceptable for the
> Play Store, which requires a dedicated upload keystore — see §4.

> **It replaces the development build on the device.** Same `applicationId`, so `adb install -r`
> overwrites a `expo run:android` dev client; you lose the Metro launcher until you rebuild one.
> Because both are signed with the same debug keystore the app's data survives, so the local
> mirror and sync outbox are preserved. If the install instead fails with
> `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, the previous build used a different signing key and you
> must `adb uninstall com.inventorymanager.mobile` first — **which wipes app data**, including the
> offline mirror and any queued outbox writes.

> **Minification is on for release.** `minifyEnabled enableMinifyInReleaseBuilds` runs R8
> (`android/app/build.gradle:118`, driven by `gradle.properties`). If the release APK misbehaves
> where the debug build did not, R8 stripping a native module's classes is the first suspect —
> check that property and `proguard-rules.pro` before hunting elsewhere.

---

## 4. Google Play — `.aab`

*Reference steps — none of this has been run from this repository.*

Play requires new apps as an **Android App Bundle**. EAS emits an `.apk` instead of a `.aab` when a
profile sets `android.buildType: "apk"`, `android.gradleCommand`, `developmentClient: true`, or
`distribution: "internal"` — this repository's `preview` profile sets `"internal"`, so it produces an
installable APK. Either way, an `.apk` **cannot** be uploaded to Play.

### 4.1 Prerequisites

1. A paid **Google Play Developer account**, and an app created in Play Console.
2. A **Google Service Account key** uploaded to EAS, so `eas submit` can act for you
   (`eas credentials --platform android`).
3. A release **upload keystore**. EAS generates and stores one on first build; there is no
   `credentials.json` in this repository, so expect to be prompted.
4. `android.versionCode` set in `app.json` and incremented for every release (§2.3).
5. Play Console setup tasks finished before production rollout: privacy policy, store listing
   assets, content rating, data safety.

### 4.2 Build and submit

```powershell
cd D:\inv\mobile-client
npx eas-cli@latest login
npx eas-cli@latest build  --platform android --profile production   # -> .aab
npx eas-cli@latest submit --platform android
```

- The `production` profile in `eas.json` sets `autoIncrement: true`, which bumps
  `android.versionCode` for you.
- For a brand-new app the default `eas submit` creates the **first release on the internal testing
  track**, before the store listing is complete. Set `"releaseStatus": "draft"` in the submit
  profile to upload without rolling out.
- Alternative for the very first release: upload manually in Play Console — *Create app* →
  *Test and release ▸ Testing ▸ Internal testing* → *Create new release* → choose a signing key →
  upload the `.aab`. Prefer **Google-generated** signing key so the app survives losing your
  keystore.

### 4.3 Blockers in this repository

| Blocker | Detail |
| ------- | ------ |
| API endpoint | `README.md` requires an **HTTPS** endpoint for store submission; this stack is served over plain HTTP today |
| No upload keystore | only the debug keystore exists; Play needs a real upload keystore |
| `versionCode` | absent from `app.json` |
| Store assets | screenshots, feature graphic, descriptions, privacy policy |
| No EAS project | no `credentials.json`, no linked EAS project — the first build links it |

---

## 5. Apple App Store — `.ipa`

*Reference steps — no `ios/` directory exists and there is no Apple Developer account.*

An App Store release needs a paid **Apple Developer** membership and an app record in **App Store
Connect** whose bundle identifier matches `ios.bundleIdentifier`.

> **Verified** — `app.json` already sets `ios.bundleIdentifier` to `com.inventorymanager.mobile`
> and supplies the App Review privacy strings (`NSCameraUsageDescription`,
> `NSPhotoLibraryUsageDescription`, and both Bluetooth descriptions), so that prerequisite is
> largely met. `ios/` does not exist yet; Continuous Native Generation will create it.

### 5.1 EAS route (works from Windows)

This is the only route that does not require a Mac on hand — Expo's docs state `eas submit` runs on
macOS, Linux, and Windows.

```powershell
cd D:\inv\mobile-client
npx eas-cli@latest login
npx eas-cli@latest build  --platform ios --profile production   # -> .ipa, needs Apple credentials
npx eas-cli@latest submit --platform ios                        # -> App Store Connect
```

`eas build --platform ios` prompts for Apple credentials and manages the distribution certificate
and provisioning profile. The upload appears in **TestFlight** after processing (usually 10–15
minutes); it is **not** released automatically. Finish the metadata and screenshots in App Store
Connect, select the build, and submit it for App Review.

> `eas build --platform ios --local` requires macOS. Only the *submit* step is platform-agnostic.

### 5.2 Local Mac route

On a Mac with Xcode:

```sh
cd mobile-client
npx expo prebuild                # generates ios/ (CNG)
xed ios                          # open the workspace in Xcode
```

Then, in Xcode:

1. Select the app in the sidebar → **Signing & Capabilities** → choose your **Team** so Xcode
   manages the provisioning profile and signing certificate.
2. **Product ▸ Scheme ▸ Edit Scheme** → set **Build configuration** to **Release**.
3. **Product ▸ Build**, then **Product ▸ Archive**.
4. In the Archives organizer choose **Distribute App ▸ App Store Connect** and follow the prompts.
5. To upload later instead, choose **Export** to get a `.ipa`, then upload it with Apple's
   **Transporter** app (drag the `.ipa` in → **Deliver**).

An existing `.ipa` — for example downloaded from an EAS build — can also be uploaded with
Transporter directly, with no Xcode archive step.

App Store Connect requires a privacy-practices declaration for every new app and update. Apple
currently requires uploads built against a recent iOS SDK, so use a current Xcode.

---

## 6. Updates after release

There is **no `expo-updates` dependency**, so there is no over-the-air update channel: every change
to JavaScript requires a fresh APK or store build. To adopt OTA later, add `expo-updates`,
configure it in `app.json`, and publish with `eas update`. Store-distributed apps still require a
new binary whenever *native* dependencies or config plugins change.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `CLEARTEXT communication to <host> not permitted` | release manifest lost `usesCleartextTraffic` | ensure the `expo-build-properties` plugin is in `app.json`, then verify with `aapt2` (§3) |
| App says *"Could not reach the server"* instantly, not after a timeout | same as above — Android blocks cleartext, it is not a firewall problem | as above |
| `Missing argument in parameter list` | unquoted comma in PowerShell | quote `"-PreactNativeArchitectures=arm64-v8a,armeabi-v7a"` |
| `ninja: error: manifest 'build.ninja' still dirty after 100 tries` | object paths exceed CMake's 250-char limit | build from a short root such as `D:\mc` |
| `more than one device/emulator` | wireless device enumerated twice | `$env:ANDROID_SERIAL = '<serial>'` |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | different signing key than the installed build | `adb uninstall com.inventorymanager.mobile` (**erases app data, including the offline mirror and outbox**) |
| Release APK misbehaves but debug was fine | R8 minification | inspect `enableMinifyInReleaseBuilds` in `gradle.properties` and `proguard-rules.pro` |
| Cloud build ignores your API URL | `.env.local` is gitignored and not uploaded | set `env` in the `eas.json` build profile |
| Play rejects the upload | an `.apk` was submitted | submit the `.aab` from the `production` profile |

---

## 8. Reference links

- Build APKs for Android — <https://docs.expo.dev/build-reference/apk/>
- EAS Build introduction — <https://docs.expo.dev/build/introduction/>
- Submit to Google Play with EAS Submit — <https://docs.expo.dev/submit/android/>
- Manual first release in Play Console — <https://docs.expo.dev/submit/android-manual/>
- Submit to the Apple App Store with EAS Submit — <https://docs.expo.dev/submit/ios/>
- Manual iOS submission with Xcode / Transporter — <https://docs.expo.dev/submit/ios-manual/>
- `eas.json` reference — <https://docs.expo.dev/eas/json/>
- Android app signing (React Native) — <https://reactnative.dev/docs/signed-apk-android>
