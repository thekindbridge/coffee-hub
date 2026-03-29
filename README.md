# Coffee Hub

Coffee Hub is a web-only ordering platform built with React, Vite, Firebase, Firestore, and Vercel serverless APIs.

The repository now contains a single active application:

```text
Coffee-Hub/
  coffee-hub-web/
```

## What the web app includes

- Customer ordering flow
- Cart and checkout
- Offers and coupons
- Order history and live tracking
- Admin operations dashboard
- Delivery-agent operations dashboard
- Browser push notifications
- PWA install support

## Tech stack

- React 19
- TypeScript
- Vite
- Firebase Auth
- Firestore
- Vercel Functions
- Tailwind-based styling

## Main structure

```text
coffee-hub-web/
  api/                # Vercel serverless routes
  shared/             # Shared domain rules used by web + backend
  src/
    app/              # App bootstrap, shells, router, providers
    pages/            # Page containers and page-local UI
    components/       # Reusable shared UI
    features/         # Business logic and feature hooks
    services/         # Firebase, browser, and API integrations
    hooks/            # Shared hook entrypoints
    store/            # Shared app state shims / stores
    utils/            # Pure helpers
  firebase.json
  firestore.rules
  vercel.json
```

## Local development

```bash
cd coffee-hub-web
npm install
npm run dev
```

Useful validation commands:

```bash
npm run typecheck
npm run build
```

## Required environment

Create `coffee-hub-web/.env.local` with the Firebase web config used by the client:

- `VITE_API_KEY` or `VITE_FIREBASE_API_KEY`
- `VITE_AUTH_DOMAIN` or `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_PROJECT_ID` or `VITE_FIREBASE_PROJECT_ID`
- `VITE_STORAGE_BUCKET` or `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_MESSAGING_SENDER_ID` or `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_APP_ID` or `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`
- `VITE_GOOGLE_MAP_KEY`
- `VITE_ADMIN_EMAIL`

Server-side Vercel/Firebase Admin variables:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `CRON_SECRET`

## Architecture notes

- UI stays in `src/pages` and `src/components`
- Business logic stays in `src/features`
- External I/O stays in `src/services` and `api/`
- Domain rules stay in `shared/`

The repository is intentionally web-only. Any old mobile or Expo references have been removed so the codebase stays focused on the React web application.
