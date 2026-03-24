# Coffee Hub

Comprehensive project documentation for the Coffee Hub ordering system.

This document reflects the current repository state reviewed on March 24, 2026. It is written as an onboarding guide for engineers who need to understand how the system works, how the codebase is organized, and how to extend it safely.

## Repository Summary

Coffee Hub currently contains two application codebases in the same repository:

- `coffee-hub-web` - the main working web application, including customer flows, admin tools, delivery flows, Vercel API routes, and Firebase integration.
- `CoffeeHubApp` - the Expo React Native mobile application. The project structure, navigation, theme, menu UI, and cart foundation are in place, but the mobile app is not yet feature-complete relative to the web app.

Important current-state note:

- The web app is the source of truth for most business logic today.
- The mobile app is being built to match the web app's design, naming, and API contracts.
- Shared logic is currently aligned by naming and behavior, but it is not yet extracted into a shared package consumed by both apps.

## 1. Project Overview

### What is Coffee Hub?

Coffee Hub is a digital ordering system for a local coffee and snack business. It allows customers to browse the menu, place orders, track delivery progress, and manage their profile. It also provides operational tools for shop staff, administrators, and delivery agents.

### Problem It Solves

Coffee Hub solves a common small-business problem: handling orders, customer details, delivery coordination, and shop operations across multiple channels without relying on manual phone calls or disconnected tools.

It improves:

- Menu discovery for customers
- Faster repeat ordering
- Cleaner order tracking
- Better shop-side order management
- Better delivery coordination

### Target Users

- Customers who want to browse the menu and place an order
- Shop owners or admins who manage orders, offers, menu items, and shop timing
- Delivery staff who need assigned orders and delivery tracking

### Real-World Use Case

1. A customer opens Coffee Hub on web or mobile.
2. The customer signs in, browses available drinks and food, and adds items to the cart.
3. The customer places a cash-on-delivery order.
4. The order is stored in Firestore through a Vercel API.
5. Admin staff accept the order, prepare it, and assign a delivery agent.
6. The delivery agent completes the delivery and updates the final status.
7. The customer sees the updated order state and receives notifications where enabled.

## 2. Features

### Customer Features

#### Currently Implemented in Web

- Google sign-in through Firebase Authentication
- Customer-facing pages for Home, Menu, Offers, Tracking, About, and Contact
- Real-time menu loading from Firestore
- Menu cards with ratings, veg/non-veg, spice level, price, and quantity controls
- Cart drawer with add/remove quantity controls
- Coupon and offer handling
- COD checkout flow
- Customer profile management
- Saved addresses in profile
- Shop-open and shop-closed handling based on configured timing
- Order history and order tracking
- Push notification registration for supported browsers
- PWA-style install prompt support

#### Currently Implemented in Mobile

- Login screen shell
- Stack + bottom-tab navigation
- Home screen with banner and menu list
- Menu fetch from `GET /api/menu`
- Add-to-cart interaction using a global cart store
- Cart summary screen backed by global state
- Orders and Profile screens scaffolded for future integration

#### Not Yet Implemented in Mobile

- Firebase Authentication
- Full checkout flow
- Order history integration
- Delivery tracking
- Push notifications
- Full parity with the web app

### Admin / Owner Features

#### Currently Implemented

- Admin access control using Firestore-backed role entries
- Admin dashboard components
- Admin orders management
- Order status updates
- Delivery agent assignment
- Menu management UI
- Offers management UI
- Shop timing update API
- Delivery monitoring UI
- New order alert behavior on web

### Delivery / Operational Features

#### Currently Implemented

- Delivery agent role detection
- Agent dashboard components
- Agent orders view
- Delivery session tracking
- Delivery completion flow
- Agent location and delivery session document support

### Current Implemented Features Snapshot

| Area | Web | Mobile |
| --- | --- | --- |
| Authentication | Working with Google sign-in | Placeholder local auth store |
| Menu listing | Working | Working |
| Cart | Working | Basic working state only |
| Checkout | Working, COD only | Not yet wired |
| Orders | Working | Screen scaffold only |
| Profile | Working | Basic screen scaffold |
| Admin tools | Working | Not applicable yet |
| Delivery tools | Working | Not applicable yet |
| Notifications | Web push implemented | Not implemented |

### Planned / Future Features

- Mobile app parity with the web customer experience
- Mobile Firebase Authentication
- OTP-based login using a provider such as MSG91 or Twilio
- Optional Razorpay payment integration
- Mobile notifications
- Stronger shared-code strategy across web and mobile
- Better analytics and admin reporting

## 3. Tech Stack

### Frontend

#### Web

- React 19
- TypeScript
- Vite
- Firebase Web SDK
- Tailwind-based styling setup plus custom design tokens
- Lucide icons
- Motion for UI animation

#### Mobile

- Expo
- React Native
- TypeScript
- React Navigation
- React Context for current auth and cart state

### Backend

- Vercel Serverless Functions
- Node.js 20 runtime for the web/backend package
- Firebase Admin SDK for secure server-side Firestore and messaging access

### Database

- Firebase Firestore

### Authentication

- Current web implementation: Firebase Authentication with Google login
- Current mobile implementation: local placeholder auth store
- Planned: OTP-based login and stronger mobile auth integration

### Notifications and Supporting Integrations

- Firebase Cloud Messaging for web push notifications
- Vercel Cron for queued notification flushing
- Google Maps API for delivery tracking UI on web
- Razorpay key placeholder exists in mobile config, but payment is not implemented yet

## 4. System Architecture

### High-Level Architecture

Coffee Hub uses a hybrid architecture:

- The web app uses Firebase client SDKs for real-time reads and authentication.
- Sensitive operations and order-changing actions go through Vercel APIs.
- Vercel APIs use Firebase Admin to validate tokens, enforce business rules, and write to Firestore.
- The mobile app is currently API-first and consumes shared backend endpoints.

### Main Flow

```text
Web App (React/Vite) --------------------\
                                          \
                                           > Vercel APIs -> Firebase Admin -> Firestore
                                          /
Mobile App (Expo React Native) ----------/

Web App also uses Firebase client SDK directly for:
- Google sign-in
- real-time menu
- real-time orders
- real-time profile
- real-time delivery state
- real-time shop timing
```

### Data Flow Explained

#### Customer Menu Flow

1. The client requests menu data.
2. The backend reads from the `menu_items` Firestore collection.
3. The API normalizes the document shape into a stable frontend response.
4. The client renders the menu using platform-specific UI components.

#### Order Creation Flow

1. The customer submits an order payload.
2. The Vercel API verifies the Firebase user token.
3. The API validates the payload and recalculates pricing from Firestore.
4. The API checks shop timing and coupon rules.
5. The order is written to the `orders` collection.
6. Notifications are dispatched to customer/admin recipients where available.

#### Order Operations Flow

1. Admin or delivery actions hit dedicated Vercel endpoints.
2. The backend verifies permissions.
3. The backend updates order status and delivery-related collections.
4. Firestore snapshots update the web UI in real time.

### Why This Architecture Works

- Real-time Firestore subscriptions keep the web dashboard responsive.
- Vercel APIs protect sensitive writes and centralize business rules.
- Mobile can reuse the same backend contracts without copying web UI logic.
- Naming conventions remain consistent across platforms.

## 5. Project Structure

### Root Structure

```text
Coffee-Hub/
  coffee-hub-web/
  CoffeeHubApp/
```

### `coffee-hub-web`

This folder contains both the web frontend and the Vercel backend functions.

```text
coffee-hub-web/
  api/                # Vercel API routes
  shared/             # Shared business rules used by backend and web
  src/                # React web app
  firebase.json       # Firestore/hosting config
  firestore.rules     # Firestore security rules
  vercel.json         # Vercel cron config
```

### `coffee-hub-web/src`

```text
src/
  agent/              # Delivery tracking helpers
  components/         # Shared web UI and dashboard components
  config/             # Frontend configuration
  data/               # Static/seed-friendly local data
  features/           # Feature-based modules
  hooks/              # Shared hooks
  pages/              # Page-level views
  pwa/                # PWA support
  scripts/            # Utility scripts like menu seeding
  services/           # Firebase and API services
  utils/              # Generic helpers
```

### `CoffeeHubApp`

This is the mobile application built with Expo.

```text
CoffeeHubApp/
  src/
  app.json
  eas.json
```

### `CoffeeHubApp/src`

```text
src/
  assets/             # Images and icons for mobile
  components/         # Reusable React Native UI components
  config/             # Runtime configuration such as API base URL
  constants/          # Route names, theme tokens, static values
  hooks/              # Thin wrappers around store logic
  navigation/         # Stack and tab navigation
  screens/            # Mobile screen modules
  services/           # API client functions
  store/              # Global auth and cart state
  utils/              # Generic helper functions
```

### Folder Purpose Summary

| Folder | Purpose |
| --- | --- |
| `components/` | Reusable UI pieces that should stay presentation-focused |
| `screens/` | Route-level mobile screens |
| `services/` | API calls and external integration logic |
| `hooks/` | Reusable stateful logic and access helpers |
| `store/` | Shared state for auth and cart in mobile |
| `utils/` | Small reusable helpers |
| `config/` | Environment-driven configuration |
| `constants/` | Theme tokens, route names, fixed values |

## 6. Core Modules Explanation

### Authentication System

#### Web

- The web app uses Firebase Authentication.
- Sign-in is currently handled by Google login through `signInWithPopup`.
- Backend APIs verify the Firebase ID token from the `Authorization: Bearer <token>` header.
- Admin access is checked using `ADMIN_EMAIL` or the `admin_access` collection.

#### Mobile

- The mobile app currently uses a local auth store as a temporary placeholder.
- The navigation stack already depends on auth state, so Firebase Auth can replace the placeholder later without changing navigation structure.

### Menu System

- Menu data is stored in Firestore under `menu_items`.
- The main customer API is `GET /api/menu`.
- The web app also subscribes to `menu_items` in real time when the user is logged in.
- The mobile app currently fetches the menu from the same API and renders it in `HomeScreen`.

### Cart System

#### Web

- Cart behavior lives inside customer hooks such as `useCheckoutFlow` and `useCart`.
- Coupon application, discount handling, delivery fee handling, and quantity updates are managed in reusable logic rather than page components.

#### Mobile

- Cart state lives in `src/store/CartStore.tsx`.
- The mobile cart currently handles item quantity and subtotal.
- This is enough for menu browsing and cart state persistence across screens, but not yet full checkout.

### Order System

- Orders are created through `POST /api/orders/create` or the alias `POST /api/create-order`.
- The backend recalculates order pricing from menu and offer data before saving.
- The backend enforces the valid status flow:

```text
PENDING -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED
```

- The backend also supports `REJECTED` and `CANCELLED` terminal states.
- Order status rules live in `coffee-hub-web/shared/orderStatus.ts`.

### API Integration Layer

- Backend routes are in `coffee-hub-web/api`.
- Shared backend helpers live in `coffee-hub-web/api/_lib`.
- Response mappers normalize Firestore documents into stable API contracts.
- Business rules such as pricing, notifications, and shop timing are kept out of UI components.

### State Management

#### Web

- The web app mainly uses focused React hooks plus Firestore real-time subscriptions.
- `useRealtimeAppData` composes auth, roles, menu, orders, profiles, delivery, and shop timing data into one place.

#### Mobile

- Mobile uses React Context-based stores.
- Current global stores:
  - `AuthStore`
  - `CartStore`

## 7. API Details

### API Surface Overview

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/menu` | Public by default | Returns available menu items |
| `GET` | `/api/menu?includeUnavailable=true` | Admin | Returns all menu items including unavailable ones |
| `POST` | `/api/orders/create` | Firebase user token | Creates an order |
| `POST` | `/api/create-order` | Firebase user token | Alias for order creation |
| `GET` | `/api/orders` | Firebase user token | Returns current user's orders by default |
| `GET` | `/api/orders?scope=all` | Admin | Returns all orders |
| `GET` | `/api/orders/admin` | Admin | Admin order list |
| `POST` | `/api/orders/update-status` | Admin | Updates order status |
| `POST` | `/api/orders/assign-agent` | Admin | Assigns a delivery agent |
| `POST` | `/api/orders/cancel` | Firebase user token | Cancels an eligible customer order |
| `POST` | `/api/orders/complete-delivery` | Assigned agent or admin | Marks delivery complete |
| `POST` | `/api/notifications/register-token` | Firebase user token | Stores push notification token |
| `POST` | `/api/admin/update-shop-timing` | Admin | Updates shop timing |
| `GET` | `/api/cron/flush-notifications` | Cron / secret | Flushes queued notifications |

### 7.1 `GET /api/menu`

Returns menu items from the `menu_items` collection.

#### Response

```json
{
  "menu": [
    {
      "id": "abc123",
      "name": "Cappuccino",
      "category": "Coffee",
      "price": 120,
      "spice_level": 0,
      "is_veg": true,
      "rating": 4.6,
      "image_url": "https://example.com/cappuccino.jpg",
      "description": "Freshly brewed cappuccino",
      "is_available": true
    }
  ]
}
```

#### Notes

- Public requests return available items only.
- Admins can request unavailable items too by passing `includeUnavailable=true`.
- Menu items are sorted by category, then by name.

### 7.2 `POST /api/orders/create`

Creates a new order after validating the user, recalculating pricing, checking coupon rules, and verifying shop availability.

#### Request

```json
{
  "userId": "firebase-user-uid",
  "orderDraft": {
    "orderId": "COF1001",
    "customer": {
      "name": "Pavan",
      "phone": "+91 9876543210",
      "address": "Inkollu Main Road",
      "location": {
        "lat": 15.8412,
        "lng": 80.1498
      }
    },
    "items": [
      {
        "id": "menu_doc_id",
        "name": "Cold Coffee",
        "quantity": 2,
        "price": 95
      }
    ],
    "couponCode": "WELCOME10",
    "subtotal": 190,
    "discount": 10,
    "deliveryFee": 50,
    "finalTotal": 230
  }
}
```

#### Response

```json
{
  "order": {
    "id": "COF1001",
    "doc_id": "COF1001",
    "customer_name": "Pavan",
    "phone": "+91 9876543210",
    "address": "Inkollu Main Road",
    "subtotal": 190,
    "discount": 10,
    "delivery_fee": 50,
    "final_total": 230,
    "total_amount": 230,
    "status": "Pending",
    "status_code": "PENDING",
    "payment_method": "COD",
    "payment_status": "pending",
    "user_id": "firebase-user-uid",
    "items": [
      {
        "id": "menu_doc_id-1",
        "order_id": "COF1001",
        "menu_item_id": "menu_doc_id",
        "name": "Cold Coffee",
        "quantity": 2,
        "price": 95
      }
    ]
  }
}
```

#### Important Backend Rules

- The backend does not trust client prices.
- Item prices are recalculated from `menu_items`.
- Coupons are validated from `offers`.
- Delivery fee is currently fixed in backend logic.
- Payment mode is currently forced to COD.
- Shop timing is checked before the order is created.

### 7.3 `GET /api/orders`

Returns orders for the authenticated user by default.

#### Supported Query Parameters

- `scope=mine` - default
- `scope=all` - admin only
- `orderId=<ORDER_ID>`
- `userId=<FIREBASE_UID>`
- `status=<STATUS>`
- `limit=<NUMBER>`

#### Response

```json
{
  "orders": [
    {
      "id": "COF1001",
      "doc_id": "COF1001",
      "customer_name": "Pavan",
      "status": "Preparing",
      "status_code": "PREPARING",
      "payment_method": "COD",
      "payment_status": "pending",
      "created_at": "2026-03-24T10:00:00.000Z",
      "user_id": "firebase-user-uid",
      "items": []
    }
  ]
}
```

### 7.4 Operational APIs

#### `POST /api/orders/update-status`

Used by admins to move an order through the valid status flow. Requires `orderId`, `status`, and `rejectionReason` when rejecting.

#### `POST /api/orders/assign-agent`

Used by admins to assign a delivery agent to a preparing order. Requires `orderId` and `agentId`.

#### `POST /api/orders/cancel`

Used by customers to cancel their own eligible order. Requires `orderId` and `cancellationReason`.

#### `POST /api/orders/complete-delivery`

Used by the assigned agent or admin to complete delivery. Requires `orderId` and optionally `finalLocation`.

#### `POST /api/notifications/register-token`

Stores browser/device notification registration data in Firestore.

#### `POST /api/admin/update-shop-timing`

Updates `settings/shop` with `openTime` and `closeTime`.

## 8. Database Structure (Firestore)

### Important Naming Note

Conceptually, the system works with `users`, `orders`, and `menu`. In the actual current Firestore implementation:

- `users` is stored as `users`
- `orders` is stored as `orders`
- menu data is stored as `menu_items`, not `menu`

This difference matters when writing backend code, scripts, or security rules.

### Core Business Collections

#### `users`

Purpose:

- Stores customer profile data
- Stores admin and agent profile metadata
- Stores notification settings and notification tokens

Common fields used by the current code:

- `name`
- `phone`
- `email`
- `addresses.address1`
- `addresses.address2`
- `addresses.address3`
- `notificationSettings.orderUpdates`
- `notificationSettings.offers`
- `role`
- `adminLocation`
- `vehicleType`
- `status`
- `fcmToken`
- `notificationPermission`
- `updatedAt`

Example:

```json
{
  "name": "Pavan",
  "phone": "+91 9876543210",
  "email": "pavan@example.com",
  "addresses": {
    "address1": "Home address",
    "address2": "Office address",
    "address3": ""
  },
  "notificationSettings": {
    "orderUpdates": true,
    "offers": false
  },
  "role": "customer",
  "fcmToken": "token-value",
  "notificationPermission": "granted"
}
```

#### `orders`

Purpose:

- Stores the order header and embedded item summary
- Tracks customer details, order totals, status, payment state, and delivery state

Common fields used by the current code:

- `orderId`
- `userId`
- `name`
- `phone`
- `address`
- `customerLocation`
- `deliveryLocation`
- `items[]`
- `subtotal`
- `discount`
- `deliveryFee`
- `couponCode`
- `totalAmount`
- `finalAmount`
- `paymentMode`
- `paymentStatus`
- `status`
- `orderStatus`
- `rejectionReason`
- `cancellationReason`
- `assignedAgentId`
- `assignedAgentName`
- `assignedAgentPhone`
- `assignedAgentEmail`
- `assignedAgentVehicle`
- `createdAt`
- `updatedAt`
- `acceptedAt`
- `preparingAt`
- `outForDeliveryAt`
- `deliveredAt`
- `cancelledAt`

Example:

```json
{
  "orderId": "COF1001",
  "userId": "firebase-user-uid",
  "name": "Pavan",
  "phone": "+91 9876543210",
  "address": "Inkollu Main Road",
  "customerLocation": {
    "lat": 15.8412,
    "lng": 80.1498
  },
  "items": [
    {
      "itemId": "menu_doc_id",
      "name": "Cold Coffee",
      "quantity": 2,
      "price": 95
    }
  ],
  "subtotal": 190,
  "discount": 10,
  "deliveryFee": 50,
  "couponCode": "WELCOME10",
  "totalAmount": 230,
  "finalAmount": 230,
  "paymentMode": "COD",
  "paymentStatus": "PENDING",
  "status": "PENDING",
  "orderStatus": "PENDING",
  "rejectionReason": "",
  "cancellationReason": ""
}
```

#### `menu_items`

Purpose:

- Stores the sellable menu catalog

Common fields used by the current code:

- `name`
- `category`
- `price`
- `description`
- `image`
- `rating`
- `spiceLevel`
- `veg`
- `isAvailable`
- `createdAt`

Example:

```json
{
  "name": "Cold Coffee",
  "category": "Beverages",
  "price": 95,
  "description": "Chilled coffee with a creamy top",
  "image": "https://example.com/cold-coffee.jpg",
  "rating": 4.5,
  "spiceLevel": 0,
  "veg": true,
  "isAvailable": true
}
```

### Supporting Collections

| Collection | Purpose |
| --- | --- |
| `offers` | Coupon and promotional rules |
| `settings` | Shop-wide settings such as open/close time |
| `admin_access` | Admin access entries keyed by email |
| `agents` | Delivery agent profiles and live availability |
| `delivery_sessions` | Delivery assignment and session state |
| `agent_locations` | Final/last known delivery location records |
| `notification_jobs` | Queued notification jobs used by cron flushing |
| `order_items` | Auxiliary or legacy order-item records still read by some web hydration logic |

### Firestore Rules Summary

Current rules protect:

- User profiles by `request.auth.uid`
- Order reads for admin, owner, or assigned agent
- Order creation only for authenticated users writing their own `userId`
- Agent and delivery collections for admin or eligible delivery users
- `settings` as read-only to signed-in users from the client

## 9. Application Flow (Step-by-Step)

### Customer Order Flow

1. The user opens the application.
2. The user signs in.
3. The client loads available menu items.
4. The user adds items to the cart.
5. The user enters or confirms delivery details.
6. The client sends an order draft to `POST /api/orders/create`.
7. The backend validates the token, pricing, coupon, and shop timing.
8. The backend stores the order in Firestore.
9. Admin staff see the new order.
10. The order status moves through preparation and delivery.
11. The customer sees updated order data and notifications where available.

### Admin and Delivery Flow

1. Admin sees incoming orders in real time.
2. Admin accepts the order.
3. Admin moves the order to preparing.
4. Admin assigns an available delivery agent.
5. Delivery session data is written to Firestore.
6. Agent handles delivery.
7. Agent or admin marks delivery complete.
8. The order is marked as delivered and related agent/session data is updated.

## 10. UI/UX Design Approach

### Design Philosophy

Coffee Hub uses a clean, modern, coffee-themed visual style. The current design language favors:

- Strong contrast
- Dark coffee surfaces
- Warm accent colors
- Large touch-friendly action areas
- Clear card-based content separation

### Mobile-First and Cross-Platform Strategy

- The mobile app is rebuilding the existing web experience using React Native primitives instead of copying web markup.
- The goal is not to copy HTML or CSS directly.
- The goal is to reproduce the same information hierarchy, layout logic, color system, and user flow in native components.

### Component-Based UI

Examples of reusable UI already present:

- Menu item cards
- Shared buttons
- Banner / hero sections
- Layout shells
- Loader and card primitives

### Reusability Strategy

- Business logic should stay in services, hooks, and store modules.
- Visual components should remain as stateless as possible.
- Screen files should compose reusable pieces rather than contain all logic directly.

## 11. Current Limitations

- Mobile authentication is still a placeholder store, not Firebase-backed yet.
- Mobile order history, checkout, and profile flows are not yet fully wired.
- Mobile `createOrder()` and `getOrders()` service scaffolding exists, but the mobile UI does not yet implement the full production web checkout contract.
- The backend currently enforces cash on delivery. Razorpay is not integrated yet.
- OTP login is not implemented.
- Shared logic is aligned by naming, but not yet extracted into a dedicated cross-platform package.
- Some real-time features currently exist only in the web app.
- Delivery tracking on web depends on proper Google Maps configuration.

## 12. Future Roadmap

- Complete the mobile customer flow
- Replace mobile placeholder auth with Firebase Auth
- Add OTP login support
- Add optional Razorpay payment flow
- Add mobile push notifications
- Extract common domain logic into a shared package
- Improve admin reporting and operational insights
- Strengthen automated testing and release checks

## 13. Development Workflow

### Prerequisites

- Node.js 20.x for the web/backend package
- npm
- Firebase project with Firestore and Authentication
- Vercel project for API deployment
- Expo / EAS tooling for mobile builds

### Run the Web App Locally

```bash
cd coffee-hub-web
npm install
npm run dev
```

Useful web commands:

```bash
npm run typecheck
npm run build
npm run lint
npm run seed-menu
```

### Run the Mobile App Locally

```bash
cd CoffeeHubApp
npm install
npx expo start
```

Useful mobile commands:

```bash
npm run typecheck
npx expo start --android
npx expo start --ios
```

### Build Android APK / App Bundle with EAS

The mobile app includes `development`, `preview`, and `production` profiles in `CoffeeHubApp/eas.json`.

Examples:

```bash
cd CoffeeHubApp
npx eas build --platform android --profile preview
npx eas build --platform android --profile production
```

Current EAS notes:

- `preview` is for internal distribution
- `production` uses remote app versioning with auto increment

### Environment Setup

#### Web Frontend Environment

The web app expects Firebase client configuration and some optional keys.

Main variables used by the codebase:

- `VITE_API_KEY` or `VITE_FIREBASE_API_KEY`
- `VITE_AUTH_DOMAIN` or `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_PROJECT_ID` or `VITE_FIREBASE_PROJECT_ID`
- `VITE_STORAGE_BUCKET` or `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_MESSAGING_SENDER_ID` or `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_APP_ID` or `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_VAPID_KEY`
- `VITE_ADMIN_EMAIL`
- `VITE_GOOGLE_MAP_KEY`

#### Vercel / Server Environment

The backend requires Firebase Admin credentials and operational configuration.

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`
- `FIREBASE_PROJECT_ID` or `VITE_FIREBASE_PROJECT_ID`
- `ADMIN_EMAIL` or `VITE_ADMIN_EMAIL`
- `CRON_SECRET` for secured cron execution

#### Mobile Environment

The mobile app reads runtime config from `CoffeeHubApp/src/config/env.ts`.

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_RAZORPAY_KEY_ID`

### How to Update the App Safely

1. Make the change in the correct platform folder.
2. Keep API names and domain field names aligned across web and mobile.
3. If a backend payload changes, update:
   - API route
   - response/request types
   - service client
   - UI consumers
4. Run typecheck for the affected app.
5. Test the user flow end to end.
6. Use EAS preview builds before production mobile release.

## 14. Best Practices Followed

- Modular architecture
- Clear separation of UI, state, and service layers
- Backend validation for sensitive business logic
- Real-time reads where they provide clear product value
- Platform-specific UI with shared naming and API contracts
- Iterative feature development
- Reusable components instead of large screen files
- Centralized status and timing rules in shared modules

### Practical Examples in This Codebase

- Order status rules live in `shared/orderStatus.ts`, not in UI components.
- Shop timing rules live in `shared/shopTiming.ts`, not repeated in multiple screens.
- Firestore documents are normalized through mapper functions before being consumed by the UI.
- Mobile screens stay thin by delegating logic to stores, hooks, and reusable components.

## 15. Contribution Guide

### How Team Members Should Work

- Build features in small, reviewable iterations
- Keep one responsibility per file whenever possible
- Prefer extending existing modules over duplicating logic
- Keep web and mobile naming aligned
- Treat backend contracts as shared product interfaces

### Coding Rules

- Do not put business rules directly inside UI components.
- Do not duplicate API logic across multiple files.
- Keep screens focused on composition and flow.
- Keep services focused on external I/O.
- Keep hooks focused on reusable stateful behavior.
- Keep store modules focused on cross-screen state only.

### Folder Usage Rules

| Folder | Team Rule |
| --- | --- |
| `components/` | UI only, minimal business logic |
| `screens/` / `pages/` | Compose views, avoid heavy data logic |
| `services/` | All API and Firebase integration belongs here |
| `hooks/` | Reusable stateful behavior and side effects |
| `store/` | Global state only when screen-to-screen sharing is needed |
| `utils/` | Pure helpers, formatting, validation |
| `config/` | Runtime and environment configuration only |
| `constants/` | Shared fixed values and tokens |

### Do's

- Reuse existing mappers and shared types
- Update documentation when backend contracts change
- Verify Firestore field names before writing new code
- Keep mobile and web service names consistent
- Add new backend rules in one place and reuse them

### Don'ts

- Do not hardcode prices or trust client totals
- Do not change Firestore field names casually
- Do not mix UI rendering with order validation logic
- Do not create duplicate versions of menu, cart, or order logic
- Do not assume mobile and web already have full feature parity

### Recommended Change Process

1. Identify whether the change is web-only, mobile-only, or shared-contract work.
2. Update the backend first when API behavior changes.
3. Update service clients and types next.
4. Update UI components last.
5. Test the full flow, not just the component.

### Suggested Reading Order

Coffee Hub is already strongest on the web side, where the full customer, admin, and delivery flows are implemented. The mobile app is intentionally being built in modular steps so it can reach parity without breaking the backend contract or duplicating business logic.

If you are new to the project, start here:

1. Read `coffee-hub-web/src/types.ts`
2. Read `coffee-hub-web/api/_lib/responseMappers.ts`
3. Read `coffee-hub-web/api/create-order.ts`
4. Read `coffee-hub-web/src/features/app/hooks/useRealtimeAppData.ts`
5. Read `CoffeeHubApp/src/navigation/AppNavigator.tsx`
6. Read `CoffeeHubApp/src/screens/HomeScreen.tsx`

That path gives the fastest understanding of the current domain model, backend contract, real-time data flow, and mobile direction.
