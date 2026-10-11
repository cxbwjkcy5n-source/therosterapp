# Building Roster for iOS

This document describes the complete, reproducible process for generating the iOS native project, archiving it in Xcode, and uploading a new build to TestFlight.

## Required Software

| Tool | Required Version | Notes |
|------|-----------------|-------|
| macOS | 14.0+ (Sonoma) | Required for Xcode 16 |
| Xcode | 16.x | Install from Mac App Store |
| CocoaPods | 1.15.x | `sudo gem install cocoapods` |
| Node.js | 24.x | Use nvm: `nvm install 24` |
| corepack | bundled with Node 24 | Enables pnpm |
| pnpm | 12.x | Managed by corepack |
| Expo CLI | bundled (no global install needed) | Use `corepack pnpm exec expo` |

## Initial Setup

### 1. Clone the repository

```bash
git clone https://github.com/cxbwjkcy5n-source/therosterapp.git
cd therosterapp
```

### 2. Enable corepack and install dependencies

```bash
corepack enable
corepack pnpm install
```

**Important:** Always use `corepack pnpm` — never `npm install` or `yarn`. The project uses a pnpm lockfile (`pnpm-lock.yaml`). Using a different package manager will corrupt the dependency tree.

## Environment Variables

The backend URL is embedded in `app.json` under `expo.extra.backendUrl` and in `lib/auth.ts` as `API_URL`. Both must point to the same production backend URL.

Current production backend: `https://jm74barr7r4uc6fksvzj98zjzm3uut3h.app.specular.dev`

No `.env` file is required for a standard production build. Do not add a `.env` file unless you are running a local backend.

## Generating the iOS Native Project

Run this command from the project root every time you need to regenerate the native iOS directory:

```bash
corepack pnpm exec expo prebuild --platform ios --clean
```

This will:
- Generate the `ios/` directory (not committed to git — it is always generated fresh)
- Apply all custom Expo config plugins in `plugins/`
- Configure OneSignal notification extension
- Set the iOS deployment target to 16.0
- Set `ENABLE_USER_SCRIPT_SANDBOXING = NO` for build script compatibility

**Do not manually edit files inside `ios/` — they will be overwritten on the next prebuild.**

## Installing CocoaPods

After prebuild completes:

```bash
cd ios && pod install && cd ..
```

Expected output: `Pod installation complete! X pods installed.`

If pod install fails with Ruby or gem errors:
```bash
sudo gem install cocoapods
pod repo update
cd ios && pod install && cd ..
```

## Opening the Xcode Workspace

**Always open the `.xcworkspace` file, never the `.xcodeproj`:**

```bash
open ios/Roster.xcworkspace
```

## Validating the Production JavaScript Bundle

Before archiving, verify the production bundle builds without errors:

```bash
corepack pnpm exec expo export:embed \
  --platform ios \
  --dev false \
  --entry-file index.ts \
  --bundle-output /tmp/roster-release.js \
  --assets-dest /tmp/roster-assets \
  --reset-cache
```

A successful run produces no errors and writes the bundle to `/tmp/roster-release.js`.

## Incrementing the Build Number

Before each TestFlight upload, increment the build number in Xcode:

1. Open `ios/Roster.xcworkspace` in Xcode
2. Select the `Roster` target in the project navigator
3. Go to **General** tab
4. Increment the **Build** number (e.g. `4` → `5`)

Alternatively, edit `app.json` and increment `expo.ios.buildNumber` before running prebuild.

## Creating a Release Archive

1. In Xcode, select scheme **Roster**
2. Set destination to **Any iOS Device (arm64)**
3. Menu: **Product → Archive**
4. Wait for the archive to complete (5–15 minutes)
5. The Organizer window opens automatically

## Uploading to TestFlight

1. In the Organizer, select the new archive
2. Click **Distribute App**
3. Select **App Store Connect**
4. Select **Upload**
5. Leave all options at defaults (include symbols, upload bitcode if prompted)
6. Click through to upload

The build will appear in App Store Connect → TestFlight within 5–30 minutes.

## Troubleshooting

### "Invalid Podfile: Specifying multiple post_install hooks is unsupported"

**Cause:** A custom plugin was appending a second `post_install` block to the Podfile.

**Fix:** Already resolved. `plugins/withIosDeploymentTarget.js` now uses `withXcodeProject` to modify the pbxproj directly and never touches the Podfile.

**If it recurs:** Check that no plugin uses `withDangerousMod` to append to the Podfile. All deployment target and build setting changes must use `withXcodeProject`.

### "Cannot find module '@expo/config-plugins'"

**Cause:** The package was only a transitive dependency, not declared directly.

**Fix:** Already resolved. `@expo/config-plugins` is now an explicit dependency in `package.json`.

### "Error loading Metro config: Cannot find module 'metro-cache'"

**Cause:** `metro-cache` was only a transitive dependency.

**Fix:** Already resolved. `metro-cache` is now an explicit dependency in `package.json`.

### "Cannot find module 'babel-preset-expo'"

**Cause:** `babel-preset-expo` was only a transitive dependency.

**Fix:** Already resolved. `babel-preset-expo` is now an explicit dependency in `package.json`.

### Hermes private property errors (#x, #y, #width, #height)

**Cause:** Hermes in older RN versions did not support private class fields.

**Status:** React Native 0.81.5 with Hermes supports private class fields natively. No Babel workaround is needed. Do not add `@babel/plugin-transform-private-methods` or `@babel/plugin-transform-class-properties` to `babel.config.js` — they are already included in `@react-native/babel-preset`.

### Missing dSYM warnings on App Store Connect upload

**Cause:** Release builds were not configured to generate dSYM files.

**Fix:** Already resolved. `plugins/withDSYM.js` sets `DEBUG_INFORMATION_FORMAT = dwarf-with-dsym` for all Release configurations.

### "This branch has been merged and no longer has an active sandbox"

**Cause:** The app was pointing to a development branch backend URL that was subsequently merged and deactivated.

**Fix:** Already resolved. `app.json` and `lib/auth.ts` now point to the production backend URL. This error will not recur as long as the production backend remains deployed.

### CocoaPods deployment target warnings (iOS 9.0, 12.4, 13.4)

**Cause:** Some CocoaPods dependencies declare lower minimum deployment targets than the app.

**Fix:** Already resolved. `plugins/withIosDeploymentTarget.js` sets `IPHONEOS_DEPLOYMENT_TARGET = 16.0` in the pbxproj for all build configurations, which overrides the per-pod settings at the project level.

### expo-doctor version mismatch warnings

**Status:** Five packages (`react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-svg`, `react-native-webview`, `@react-native-community/datetimepicker`) are intentionally pinned to newer minor versions than Expo SDK 54 expects. They are excluded from expo-doctor's version check via `expo.install.exclude` in `package.json`. These newer minor versions are compatible and were verified during the TestFlight build process.

## Complete Build Checklist

Before each TestFlight release:

- [ ] `git pull origin main` — get latest changes
- [ ] `corepack pnpm install` — install/update dependencies
- [ ] `corepack pnpm exec expo-doctor` — verify no new issues
- [ ] `corepack pnpm exec expo prebuild --platform ios --clean` — regenerate iOS project
- [ ] `cd ios && pod install && cd ..` — install CocoaPods
- [ ] Increment build number in Xcode
- [ ] `corepack pnpm exec expo export:embed --platform ios --dev false --entry-file index.ts --bundle-output /tmp/roster-release.js --assets-dest /tmp/roster-assets --reset-cache` — validate bundle
- [ ] Product → Archive in Xcode
- [ ] Distribute to TestFlight via Organizer
