# Coffee Hub Final Pre-Publish Checklist

Prepared on: May 6, 2026

## Build and release

- [x] `coffee-hub-cap/android` release AAB builds successfully
- [x] Release build is non-debuggable
- [x] Target SDK is 36
- [ ] Set final `versionCode` and `versionName`
- [ ] Create or confirm the final Play upload key
- [ ] Configure signing secrets in release environment

## Firebase and backend

- [ ] Deploy updated Firestore rules
- [ ] Confirm Firebase Auth release fingerprints are registered
- [ ] Verify production OTP flow on the signed release build
- [ ] Confirm main admin phone and role assignment records are correct
- [ ] Confirm shop timing and active menu data are ready for review

## Privacy and legal

- [x] Privacy policy drafted
- [x] Terms and conditions drafted
- [x] Account deletion request page prepared
- [ ] Publish privacy policy on a public production URL
- [ ] Publish account deletion page on a public production URL
- [ ] Verify in-app legal links resolve correctly in production

## Permissions and location

- [x] No background location permission in active Android shell
- [x] Location access limited to foreground-only use cases
- [ ] Verify location prompt text and user journey on a real device
- [ ] Confirm Play Console location declaration matches actual behavior

## Billing and ordering

- [x] Current reviewed flow is physical-goods ordering only
- [x] No Play Billing requirement found for the current COD flow
- [ ] Re-review payment policy if online or digital payments are added later

## Reviewer access

- [ ] Fill in real reviewer credentials in `docs/playstore-test-credentials.md`
- [ ] Test customer reviewer flow
- [ ] Test admin reviewer flow
- [ ] Test delivery-agent reviewer flow
- [ ] Confirm seeded review data is visible to all three reviewer roles

## Store listing and assets

- [x] Listing draft prepared
- [x] Asset requirements guide prepared
- [ ] Finalize icon, feature graphic, and screenshots
- [ ] Complete Data safety form in Play Console
- [ ] Complete content rating questionnaire
- [ ] Complete audience and ads declarations

## Testing and rollout

- [ ] Run internal testing on at least one low-end Android device
- [ ] Run internal testing on at least one modern Android 14 or newer device
- [ ] Smoke-test sign-in, checkout, admin, and delivery flows after uploading to internal track
- [ ] Verify app links if `android:autoVerify` is expected to work
- [ ] Roll out to internal testing before closed or production release
