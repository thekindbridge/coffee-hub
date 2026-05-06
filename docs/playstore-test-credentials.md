# Coffee Hub Play Store Test Credentials and Reviewer Access

Prepared on: May 6, 2026

This file is a submission template. Replace all placeholders before uploading the app to Google Play.

## Important reviewer access rule

Coffee Hub uses OTP login, so Play reviewers must receive stable, reusable access. Do not submit reviewer instructions that depend on a personal phone, time-sensitive live SMS access, or staff availability.

## Recommended setup before submission

1. Create three dedicated review accounts:
   - Customer review account
   - Admin review account
   - Delivery agent review account
2. Use Firebase phone numbers that are stable and pre-tested on the signed release build.
3. Seed `user_roles` and `agents` data so each review account lands in the correct role flow after login.
4. Make sure the shop is open, at least three menu items are active, and at least one end-to-end delivery scenario can be demonstrated.

## Reviewer credentials template

### Customer review account

- Phone number: `[FILL BEFORE SUBMISSION]`
- OTP or reusable verification method: `[FILL BEFORE SUBMISSION]`
- Expected landing experience: customer home screen
- Reviewer flow:
  1. Open the app.
  2. Enter the customer review phone number.
  3. Enter the reusable OTP or other approved review code.
  4. Browse menu items.
  5. Add items to cart.
  6. Open checkout, allow location if prompted, and place a test order.
  7. Open order history and tracking.

### Admin review account

- Phone number: `[FILL BEFORE SUBMISSION]`
- OTP or reusable verification method: `[FILL BEFORE SUBMISSION]`
- Expected landing experience: admin shell
- Required seeded role data:
  - `user_roles/<phone>` -> `admin`
- Reviewer flow:
  1. Open the app.
  2. Sign in with the admin review account.
  3. Verify access to order management.
  4. Verify menu management.
  5. Verify shop timing and delivery fee controls.

### Delivery agent review account

- Phone number: `[FILL BEFORE SUBMISSION]`
- OTP or reusable verification method: `[FILL BEFORE SUBMISSION]`
- Expected landing experience: delivery-agent shell
- Required seeded role data:
  - `user_roles/<phone>` -> `delivery_agent`
  - matching `agents/<agentId>` record
- Reviewer flow:
  1. Open the app.
  2. Sign in with the delivery review account.
  3. Verify access to assigned or seeded delivery orders.
  4. Verify delivery status progression and live tracking behavior.

## OTP login explanation for reviewers

Suggested Play Console note:

`Coffee Hub uses Firebase phone authentication. For Play review, we provide dedicated reusable review accounts with pre-tested OTP credentials. Do not use personal numbers. Each review account lands directly in the correct role experience after login.`

## Seed data checklist for review

- Shop status open in `settings/shop`
- At least 3 active menu items
- At least 1 pending order visible to admin
- At least 1 delivery-ready or assigned order visible to delivery agent
- Test customer order history available

## Manual reminder

If you change the Firebase project, signing certificate fingerprints, or Auth configuration, re-test every review account on the signed release AAB before submission.
