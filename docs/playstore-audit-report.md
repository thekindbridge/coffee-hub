# Coffee Hub Play Store Audit Report

Audit date: May 6, 2026

## Scope

- Submission target reviewed: `coffee-hub-cap/android`
- Remote application reviewed: `coffee-hub-web`
- Legacy repository risk also reviewed: root `android/` Expo project

## Release baseline

- Package name: `com.coffeehub.app`
- App name: `Coffee Hub`
- Min SDK: 24
- Target SDK: 36
- Release bundle verified: `coffee-hub-cap/android/app/build/outputs/bundle/release/app-release.aab`
- EAS status: not applicable to the active Capacitor submission target; a legacy Expo/EAS project still exists in the repo and should not be used for this Play submission

## Automatic fixes applied during this pass

- Disabled Android backup in the Capacitor release manifest.
- Added safer release-signing configuration support through Gradle properties or environment variables.
- Confirmed release builds are non-debuggable.
- Removed unused native overlay code from `MainActivity`.
- Added in-app links to privacy policy and terms pages.
- Added a public account-deletion request page for compliance preparation.
- Added OTP resend cooldown behavior to match backend abuse controls.
- Hardened Firestore rules around role records, agent records, delivery sessions, agent locations, and non-public settings.
- Added keystore ignore rules and ignored the temporary local Gradle cache.

## Findings

| ID | Issue | Severity | Reason | Recommended fix | Status |
| --- | --- | --- | --- | --- | --- |
| A-01 | No release legal pages or in-app legal links were available in the repo | High | Google Play requires a privacy policy for apps handling personal or sensitive data, and the app should expose legal information to users | Keep the new privacy and terms pages published on the production domain and keep in-app links live | Fixed in repo; deployment still required |
| A-02 | No account-deletion path was discoverable before this pass | High | Apps with account creation must provide an account deletion path and public deletion instructions | Publish the new account-deletion page and make sure support actually processes deletion requests | Partially fixed in repo; manual operational follow-through required |
| A-03 | Firestore access around role and delivery documents was broader than necessary | High | Over-broad reads increase privacy and privilege-escalation risk | Keep the tightened rules and redeploy them before release | Fixed automatically |
| A-04 | Legacy Expo Android project still contains a tracked debug keystore and debug-signed release config | High | This is a serious repository hygiene and accidental-release risk if the wrong Android project is used | Do not ship the root `android/` app; remove the tracked debug keystore and fix or archive the legacy project | Manual action required |
| A-05 | Reviewer access for customer, admin, and delivery flows is not provisioned yet | High | Play reviewers need stable, reusable access instructions; OTP to a personal phone is not enough | Create dedicated review accounts and fill `docs/playstore-test-credentials.md` with real values before submission | Manual action required |
| A-06 | Android backup was enabled in the Capacitor shell | Medium | Backup can expose app data on restored devices and is unnecessary for this shell | Keep `android:allowBackup=\"false\"` | Fixed automatically |
| A-07 | Release signing was not production-ready in the Capacitor build | Medium | Play uploads need a real upload key flow, not ad hoc debug behavior | Use the new signing properties and configure a real upload key before release | Fixed in repo; signing values still manual |
| A-08 | OTP abuse controls existed on the backend, but the UI did not reflect cooldown timing | Medium | Users could repeatedly tap send and create noisy auth traffic | Keep the new resend cooldown behavior and verify it on a signed build | Fixed automatically |
| A-09 | `file_paths.xml` uses broad `external-path` and `cache-path` values | Medium | Broad FileProvider exposure is wider than ideal, even if no active exploit path was found | Review whether file sharing is still needed; narrow paths if future plugin usage allows | Manual review recommended |
| A-10 | App link auto-verification cannot be confirmed from repository contents alone | Medium | `android:autoVerify=\"true\"` depends on a valid hosted `assetlinks.json` file on the production domain | Verify hosted Digital Asset Links for `coffee-hub-inkollu.vercel.app` before submission | Manual action required |
| A-11 | Repo documentation still claims the project is web-only | Medium | This can confuse release work and cause the wrong app to be built or submitted | Update README and internal release notes to clearly mark the Capacitor shell as the Play target | Manual action required |
| A-12 | Root `tsconfig.json` still references Expo base config and triggers a warning during web builds when root dependencies are absent | Low | This is a repo hygiene issue, not a Play blocker, but it creates avoidable release noise | Clean up the legacy root TypeScript config or restore matching root dependencies | Manual cleanup recommended |
| A-13 | Unused native Firebase artifacts remain in the Capacitor Android tree | Low | `google-services` classpath and `google-services.json` appear unused by the current shell build | Remove them only after confirming no future native Firebase plugin depends on them | Manual review recommended |
| A-14 | Release versioning is still at `versionCode 1` and `versionName 1.0` | Low | Production releases should use intentional semantic versioning and monotonic version codes | Set the final release version before uploading to Play Console | Manual action required |

## Non-issues confirmed

- No background location permission is present.
- No notification permission is present in the active Capacitor Android release.
- No Play Billing requirement was found because the app currently supports physical food and drink orders with cash on delivery.
- The active submission target already exceeds the August 31, 2025 Google Play target API requirement by targeting SDK 36.
- Release bundle generation succeeded.

## Overall assessment

Coffee Hub is close to Play-ready for internal testing once the new legal pages and rule changes are deployed. It is not yet ready for final production submission until reviewer access, release signing, hosted legal URLs, asset link verification, and the legacy Expo repository risk are handled.
