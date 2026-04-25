# COFFEE-HUB Web

COFFEE-HUB Web is a React + Vite ordering application backed by Firebase and Vercel APIs.

## Stack

- React 19
- TypeScript
- Vite
- Firebase Auth
- Firestore
- Vercel Functions
- Tailwind-based styling

## Features

- Customer ordering flow
- Cart and coupon handling
- Cash-on-delivery checkout
- Order history and tracking
- Admin order and offer management
- Delivery agent workflow
- Browser notifications
- PWA install prompt

## Project structure

```text
src/
  app/                # bootstrap, router, shells
  pages/              # page containers + page-local components
  components/         # reusable shared UI
  features/           # business logic and stateful hooks
  services/           # firebase, browser, and API integrations
  hooks/              # shared hook entrypoints
  store/              # shared stores / compatibility shims
  utils/              # pure helpers

api/                  # Vercel routes
shared/               # shared order/shop rules
```

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Core APIs

- `GET /api/menu`
- `GET /api/orders`
- `POST /api/orders`
- `POST /api/create-order`
- `PUT /api/orders?action=update-status`
- `PUT /api/orders?action=assign-agent`
- `PUT /api/orders?action=cancel`
- `PUT /api/orders?action=complete-delivery`
- `PUT /api/orders?action=update-delivery-tracking`
- `POST /api/notifications`
- `PUT /api/admin?action=shop-timing`

## Environment

Client:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_GOOGLE_MAP_KEY`
- `VITE_MAIN_ADMIN_PHONE`
- `VITE_FIREBASE_VAPID_KEY` (optional, browser push notifications only)

Server:

- `MAIN_ADMIN_PHONE`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `CRON_SECRET`

## Notes

- This package is web-only.
- There is no Android, iOS, Expo, or React Native application in the current project.
- The lockfile may still contain optional peer metadata from third-party packages, but the app itself does not declare or use any mobile runtime dependencies.
