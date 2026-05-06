# Coffee Hub Mobile Performance and Stability Review

Review date: May 6, 2026

## Scope reviewed

- Capacitor Android shell
- Web app runtime inside the Android shell
- Real-time Firestore flows
- Delivery tracking behavior
- Small-device stability risks

## Safe findings

### 1. Android shell remains lightweight

The native shell is minimal and mostly delegates app behavior to the deployed web app. This is good for release stability because there are fewer native lifecycle and background-service risks.

### 2. Real-time flows are role-scoped

Customer, admin, and delivery-agent data loading is segmented by role. This lowers the chance of every user subscribing to every protected dataset at once.

### 3. Delivery route requests already have throttling

The delivery tracking map code already throttles route recalculation, which helps avoid excessive map churn and network noise.

### 4. No background location service was found

This reduces battery risk and Play policy exposure.

## Safe code change applied

- Removed unused native overlay logic from `MainActivity`, which reduces release noise and deprecated WebView configuration usage.

## Residual performance and stability risks

| Area | Risk level | Notes |
| --- | --- | --- |
| Google Maps delivery screen | Medium | Map rendering and live route updates can still feel heavy on low-end devices |
| Long-lived admin dashboards | Medium | Multiple open admin sessions can keep real-time listeners active for long periods |
| Legacy repo noise | Low | Root Expo config and docs mismatch create build-warning noise, not user-facing runtime failures |
| Logged error volume | Low | Production error logging remains intentionally present for diagnostics |

## Recommended manual verification on devices

- Test the customer flow on a lower-memory Android phone.
- Test login, menu, cart, checkout, and live tracking with weak network conditions.
- Test delivery-agent location updates while switching the app between foreground and background.
- Test the admin dashboard on a phone-sized screen for overflow and readability.

## Conclusion

No high-confidence crash or leak fix was safe to force automatically beyond the native cleanup already applied. The app is suitable for internal testing, with most remaining performance work being validation and tuning rather than code emergency.
