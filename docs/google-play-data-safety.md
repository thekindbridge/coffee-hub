# Coffee Hub Google Play Data Safety Worksheet

Prepared on: May 6, 2026

Use this as the working draft for the Play Console Data safety form. Review final answers against the live production build and your published privacy policy before submitting.

## Core assumptions

- App type: Android Capacitor shell backed by the Coffee Hub web app and Vercel APIs
- Authentication: Firebase Phone Auth with OTP
- Backend/data store: Firebase Firestore
- Payments in current flow: cash on delivery for physical goods
- Native Android push notifications: not currently enabled in the reviewed shell

## Data inventory

| Data type | Collected | Why it is collected | Encrypted in transit | Shared | Deletable |
| --- | --- | --- | --- | --- | --- |
| Phone number | Yes | Account sign-in, OTP verification, account recovery, anti-abuse checks | Yes | Processed by Google Firebase Auth and related anti-abuse services | Yes, by account deletion request, subject to limited retention |
| User ID and role data | Yes | Account identity, customer/admin/agent authorization | Yes | Shared only with service providers needed to operate the platform | Yes, with account deletion or data cleanup workflows |
| Name | Yes, optional | Profile display and order fulfillment | Yes | Shared only where operationally required | Yes |
| Email | Optional, mainly staff/admin scenarios | Contact and operational identity where supplied | Yes | Shared only where operationally required | Yes |
| Delivery address | Yes | Order fulfillment and saved addresses | Yes | Shared with admins and delivery agents only as needed to fulfill orders | Yes, subject to order record retention |
| Precise location | Yes, optional | Checkout location confirmation and live delivery tracking | Yes | May be processed by Google Maps or related services when mapping is used | Yes, though some historical order records may retain delivery context |
| Approximate location | Yes, optional | Fallback location support and delivery experience | Yes | May be processed by Google location services where used | Yes |
| Order history and purchase records | Yes | Order management, customer history, admin operations, dispute handling | Yes | Shared with admins and assigned delivery staff as needed | Partially; transactional records may require limited retention |
| Device or app information | Yes | Security, fraud prevention, compatibility, and service reliability | Yes | May be processed by Google Firebase, Google anti-abuse systems, and hosting providers | Usually not individually user-managed, but removed with account deletion where tied to user records |

## Console guidance

## Data collection

Recommended conservative answer: `Yes`, the app collects user data.

## Data sharing

Recommended conservative answer: `Yes, with service providers only when required to operate the app`.

Reason:

- Firebase Authentication, Firestore, Google Maps, and Vercel are part of the delivery path for core app features.
- The app does not sell personal data.

## Security practices

Recommended answers:

- Data is encrypted in transit: `Yes`
- Users can request deletion of their data: `Yes`

## Purpose mapping

Use the following purpose tags in Play Console where applicable:

- App functionality
- Account management
- Fraud prevention, security, and compliance
- Customer support

## Data the Android app does not currently require

- Contacts
- Photos or videos
- Audio recordings
- Files or documents
- Calendar
- Health data
- Financial card or bank account data
- Background location

## Important manual checks before final submission

- Confirm the published privacy policy URL exactly matches production content.
- Confirm the deletion request URL is public and reachable.
- Re-check the Data safety form if native push notifications, analytics, online payments, or additional SDKs are added later.
- If the final production build introduces new SDKs, update this worksheet before filing the Play Console form.
