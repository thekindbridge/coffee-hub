# Android Push Notification Testing

## Deploy First

1. Deploy `coffee-hub-web` so the production domain `https://coffee-hub-inkollu.vercel.app` serves the updated push hook, sound assets, and notification routing logic.
2. Deploy the updated Firestore rules from `coffee-hub-web/firestore.rules`.
3. Confirm `coffee-hub-cap/android/app/google-services.json` matches the Firebase Android app for `com.coffeehub.app`.

## Build Verification

1. Run `cmd /c npm run typecheck` inside `coffee-hub-web`.
2. Run `cmd /c npm run build` inside `coffee-hub-web`.
3. Run `.\gradlew.bat bundleRelease` inside `coffee-hub-cap/android`.
4. Confirm the release bundle exists at `coffee-hub-cap/android/app/build/outputs/bundle/release/app-release.aab`.

## Device Matrix

Use at least three physical Android devices:

- Customer device
- Admin device
- Delivery agent device

Recommended Android coverage:

- Android 13 or newer
- Android 12 or older
- One OEM device with aggressive battery management if available (MIUI, ColorOS, EMUI, OxygenOS)

## Permission Checks

1. Fresh install the Android app on each device.
2. Sign in and confirm the notification permission prompt appears once.
3. Deny permission once and confirm the app shows the in-app enable prompt instead of looping.
4. Re-enable notifications from Android Settings and reopen the app.
5. Confirm push delivery resumes after returning to the app.

## Customer Flow

1. Place an order and confirm the customer receives:
   - foreground toast + sound while the app is open
   - native Android notification while the app is backgrounded
   - native Android notification after force-closing the app
2. Update the order from admin and confirm the customer receives:
   - accepted
   - rejected
   - out for delivery
   - delivered
3. Tap each notification and confirm it opens tracking/orders correctly.

## Admin Flow

1. Place a new order from the customer device.
2. Confirm the admin receives a push in:
   - foreground
   - background
   - killed state
3. Confirm the admin notification opens the admin dashboard.
4. Cancel an order and confirm admin cancellation notifications behave the same way.

## Delivery Agent Flow

1. Assign an order to the delivery agent.
2. Confirm the agent receives a push in:
   - foreground
   - background
   - killed state
3. Tap the notification and confirm it opens the delivery workspace.
4. Cancel or reassign the delivery and confirm the follow-up notification arrives once.

## Multi-Device Checks

1. Sign the same customer account into two Android devices.
2. Place or update an order.
3. Confirm both devices receive the push.
4. Sign out from one device.
5. Confirm the signed-out device stops receiving that account's notifications.

## Reliability Checks

1. Trigger multiple rapid order updates and confirm the foreground banner does not spam duplicates.
2. Confirm sounds do not overlap during rapid notification bursts.
3. Turn one device offline, queue activity, then reconnect and confirm the next live notifications still arrive.
4. Check Firestore `push_tokens` and confirm:
   - one token document per device token
   - `active: true` for signed-in devices with granted permission
   - inactive tokens after logout or invalid-token cleanup

## OEM Battery Guidance

If a device still misses background notifications:

1. Open Android battery settings for Coffee Hub.
2. Disable battery optimization / allow unrestricted background activity.
3. Confirm autostart is enabled on OEM-managed devices if that option exists.
4. Re-test the background and killed-state scenarios.
