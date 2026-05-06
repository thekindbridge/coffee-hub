# Coffee Hub Firebase Security Review

Review date: May 6, 2026

## Scope

- Firebase Authentication
- Firestore security rules
- OTP abuse controls
- Admin and delivery-agent authorization
- Public data exposure risks

## Security posture summary

Coffee Hub already had a strong base with authenticated order ownership checks, role-based access, and backend validation for sensitive operations. This pass focused on tightening data visibility without breaking real-time behavior.

## Hardening applied automatically

- Restricted `user_roles` reads to the same authenticated phone, admins, or the configured main-admin phone.
- Restricted `agents` reads from public access to authenticated access only.
- Restricted `delivery_sessions` reads to admins, the assigned delivery agent, or users already allowed to read the related order.
- Restricted `agent_locations` reads to admins, the location-owning agent, or users already allowed to read the related order.
- Restricted `settings` reads so only the public `shop` document remains publicly readable.
- Kept the default deny-all catch-all rule in place.

## Collection access review

| Collection | Current access model | Notes |
| --- | --- | --- |
| `menu_items`, `menu`, `offers` | Public read, admin write | Appropriate for storefront catalog data |
| `user_roles` | Same-phone read, admin read, main-admin management | Improved from broader authenticated read access |
| `orders` | Customer own read, admin read/update, assigned agent read/update | Good least-privilege direction for operational data |
| `users` | Self read/update, admin override | Customer isolation exists |
| `agents` | Authenticated read, admin or self-limited write | Better than public access, but still worth operational review |
| `delivery_sessions` | Admin, linked order access, or session agent | Tightened in this pass |
| `agent_locations` | Admin, linked order access, or owning agent | Tightened in this pass |
| `notifications` | Owner-only read and limited owner update | Appropriate |
| `otp_control` | No client read or write | Correct |
| `settings/shop` | Public read | Required for storefront timing display |
| `settings/*` other docs | Admin only | Tightened in this pass |
| `meta/orderCounter` | Admin write only, no public read | Acceptable |

## Authentication and role model

- Phone login is handled by Firebase Authentication.
- Elevated access is derived from app role data and the configured main admin phone.
- Role assignment writes are locked to the main-admin phone path in Firestore rules.
- Orders, delivery sessions, and agent locations now require stronger identity alignment to read protected records.

## OTP abuse review

Existing server-side OTP controls were already present and were preserved:

- minimum 60-second gap between requests;
- 3-request limit in a 10-minute window;
- 15-minute block after abuse threshold is exceeded;
- Firebase-managed phone-auth anti-abuse protections and reCAPTCHA or app verification.

The UI now reflects cooldown timing so users are less likely to spam resend requests.

## Remaining risks and recommendations

### 1. App Check is not enabled

Risk: medium

App Check could reduce scripted abuse against Firebase-backed resources, but enabling it without a rollout plan could break the deployed web app or Android shell. Recommended as a staged follow-up, not an automatic fix in this pass.

### 2. Legacy operational governance still matters

Risk: medium

Firestore rules can restrict writes, but human role assignment processes still need discipline. Limit who can update the `settings/security` main admin phone and keep review logs for elevated access changes.

### 3. `users` document shape should be re-reviewed

Risk: low to medium

The current rules are strict, which is good, but future profile fields should be added carefully so client changes do not silently fail. Do not broaden this schema casually.

### 4. Delivery data retention should be operationally defined

Risk: low

The app stores delivery and order history. Define how long completed delivery sessions and precise location records are retained in production operations.

## Overall conclusion

The Firebase security posture is materially stronger after this pass and remains compatible with existing realtime behavior. Before Play submission, the most important remaining Firebase-related tasks are:

- deploy the updated Firestore rules;
- test customer, admin, and agent paths on production-like data;
- optionally plan a staged App Check rollout after release stabilization.
