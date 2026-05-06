# Coffee Hub OTP and Billing Protection Review

Review date: May 6, 2026

## Billing position

Coffee Hub currently supports physical food and drink ordering with cash on delivery in the reviewed flow.

### Result

- Google Play Billing is not required for the current reviewed checkout flow because the app is ordering physical goods.
- Do not add digital goods, subscriptions, or external purchase unlocking without re-reviewing Play payments policy.

## OTP protection status

### Existing backend protections confirmed

- 60-second minimum gap between OTP requests
- 3 OTP requests allowed within a 10-minute window
- 15-minute temporary block after abuse threshold is exceeded
- Firebase phone-auth anti-abuse checks remain in place

### UI protections added in this pass

- resend cooldown countdown on the login screen;
- clearer pacing between OTP attempts;
- preserved visible reCAPTCHA fallback behavior when needed.

## Abuse risks reviewed

| Risk | Current state | Recommendation |
| --- | --- | --- |
| OTP spam | Mitigated by backend throttle and UI cooldown | Keep current limits and monitor for false positives |
| Bot or scripted OTP abuse | Partially mitigated by Firebase verification and app logic | Consider staged App Check rollout later if abuse increases |
| Reviewer login failure | Not solved automatically | Use dedicated review accounts with stable credentials |
| Billing abuse | Low in current COD-only flow | Re-review if online payment or wallet features are added |

## Manual production recommendations

- Configure Firebase Auth allowed regions and anti-abuse settings appropriately.
- Confirm release SHA-1 and SHA-256 fingerprints are registered in Firebase for the signed app.
- Test OTP flow on low-connectivity Android devices.
- Prepare reusable Play review credentials before submission.
- Monitor OTP control responses in logs after rollout.

## Conclusion

The current OTP posture is good for launch once reviewer credentials and release signing are finalized. Billing risk is low because the app does not currently require Play Billing.
