# Coffee HUB

Coffee HUB is a React + Vite ordering app backed by Vercel APIs, Firebase Auth, Firestore, and a mobile-friendly PWA shell. The legacy Bubblewrap/TWA Android wrapper has been removed so the codebase can evolve cleanly toward React Native and additional role-based clients.

## Architecture

- Web app: React 19 + Vite + TypeScript
- Backend: Vercel serverless APIs in `api/`
- Data: Firebase Authentication + Firestore
- Realtime operations: Firestore subscriptions for menu, orders, delivery state
- Mobile installability: PWA manifest + service worker + install prompt

## Current checkout mode

The checkout flow in this repository currently creates authenticated cash-on-delivery orders through `/api/orders/create`.

If Razorpay support is required, add dedicated payment order creation and payment verification endpoints before wiring a native client to online payments.

## Setup

1. Install dependencies with `npm install`.
2. Create `.env.local` with Firebase web config values.
3. Configure Vercel server env vars for Firebase Admin:
   - `FIREBASE_ADMIN_PROJECT_ID`
   - `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `FIREBASE_ADMIN_PRIVATE_KEY`
4. Start the web app with `npm run dev`.
5. Run validation with `npm run lint` and `npm run build`.

## API surface

- `GET /api/menu`
  Returns clean menu JSON for web or mobile clients.
- `GET /api/orders`
  Returns authenticated order history for the signed-in user.
- `GET /api/orders?scope=all`
  Admin-only order listing for future dashboards and staff apps.
- `POST /api/orders/create`
  Authenticated order creation with server-side pricing validation.
- `POST /api/create-order`
  Backward-compatible alias for the same order creation handler.
- `POST /api/admin/update-shop-timing`
  Admin-only shop timing updates.

## Firestore collections

- `menu_items`
- `orders`
- `offers`
- `customer_profiles`
- `agents`
- `delivery_sessions`
- `admin_access`
- `delivery_access`

## Future mobile direction

The backend now exposes reusable JSON endpoints for menu and order retrieval, so the next phase can move shared business rules into APIs while React Native and delivery/admin clients consume the same contract.
