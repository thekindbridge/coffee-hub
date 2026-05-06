# Coffee Hub Android Permissions Review

Review date: May 6, 2026

Submission target: `coffee-hub-cap/android`

## Summary

The active Capacitor Android shell is lean and does not request background location, contacts, storage, camera, microphone, SMS, call logs, or notification permissions.

Inline manifest comments were added to document why the active permissions exist.

## Merged release permission inventory

| Permission or feature | Type | Why it exists | Play Store declaration guidance |
| --- | --- | --- | --- |
| `android.permission.INTERNET` | Normal | Required to load the deployed Coffee Hub web app and call backend or Firebase services | No special declaration normally needed |
| `android.permission.ACCESS_COARSE_LOCATION` | Dangerous | Supports optional location capture for delivery destination and live delivery features | Declare as foreground location only |
| `android.permission.ACCESS_FINE_LOCATION` | Dangerous | Supports precise delivery location capture and real-time delivery tracking where the user opts in | Declare as foreground location only |
| `android.permission.ACCESS_NETWORK_STATE` | Normal | Merged by runtime dependencies to detect network conditions and support webview behavior | No special declaration normally needed |
| `android.hardware.location.gps` (`required=false`) | Feature flag | Indicates GPS-capable devices are supported, but not required | Safe because the feature is optional |
| `com.coffeehub.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | Signature-level generated permission | AndroidX-generated internal protection for dynamic receivers | No Play disclosure needed |

## What is not present

- No background location permission
- No `POST_NOTIFICATIONS`
- No camera permission
- No contacts permission
- No microphone permission
- No phone-state permission
- No SMS permission
- No external storage read or write permission

## Location compliance position

Recommended Play Console justification:

`Coffee Hub requests foreground location only when the user places a delivery order or uses live delivery tracking. The permission helps confirm a delivery destination and display route progress for active orders. The app does not request or use background location.`

## Developer notes

- Keep location requests contextual and user-triggered.
- Do not add background location unless a future business requirement absolutely depends on it.
- If native Android push notifications are introduced later, re-audit the merged manifest because new permissions may appear.

## Conclusion

The active Android shell permission set is Play-friendly and minimal for the current feature set.
