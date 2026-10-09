# Build Notes

## iOS Build Number
The iOS build number is set in `app.json` under `expo.ios.buildNumber`.
Current value: `"4"`

To increment for a new TestFlight upload:
1. Open `app.json`
2. Change `"buildNumber": "4"` to `"buildNumber": "5"` (or the next integer)
3. Commit and push — EAS will use this value automatically.

Alternatively, `eas.json` already has `"autoIncrement": true` in the production profile,
which means EAS Build will auto-increment the build number on each submission.
If `autoIncrement` is enabled, you do not need to manually change `buildNumber` —
EAS handles it. The value in `app.json` serves as the floor/starting point.

## Android Version Code
Set in `app.json` under `expo.android.versionCode`. Increment alongside iOS build number.

## Bundle Identifier
iOS: `com.d62de040124e438994b5a60819342428.app`
Android: set via `expo.android.package` (not yet configured — add if needed).
