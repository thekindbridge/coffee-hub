# Coffee Hub Play Store Release Summary

Prepared on: May 6, 2026

## What was fixed

- Disabled Android backup in the active Capacitor shell.
- Added safe release-signing configuration support and confirmed release builds are non-debuggable.
- Removed unused native overlay code from `MainActivity`.
- Added OTP resend cooldown behavior to the login screen.
- Added privacy policy, terms, and public account-deletion pages plus in-app legal links.
- Hardened Firestore rules for role, agent, delivery-session, agent-location, and non-public settings access.
- Verified `bundleRelease` succeeds and generates an AAB for `com.coffeehub.app`.

## What was hardened

- Play policy readiness for privacy, data safety, permissions, and reviewer documentation.
- Firebase least-privilege access around sensitive operational collections.
- Repository hygiene around keystore ignores and temporary Gradle artifacts.
- Release build readiness for signing and Play upload flow.

## What still requires manual action

- Publish the legal pages to the production domain and verify the links live in the deployed web app.
- Fill real reviewer credentials into `docs/playstore-test-credentials.md`.
- Deploy updated Firestore rules.
- Configure the final release signing key and version numbers.
- Verify hosted `assetlinks.json` for app-link auto verification.
- Resolve or archive the legacy root Expo Android project so it cannot be confused with the active Play target.

## Play Store readiness status

Status: ready for internal testing after deployment and credential setup, but not yet ready for final production submission.

## Remaining risks

- Reviewer login failure if OTP review credentials are not prepared correctly.
- Accidental use of the legacy root `android/` Expo project instead of `coffee-hub-cap/android`.
- Broad `file_paths.xml` scope should be reviewed before future native file-sharing features are added.
