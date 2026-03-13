# COFFE HUB - Firebase Edition

COFFE HUB is now a frontend-only React + Vite + Tailwind app powered by Firebase.

## Stack

- React + TypeScript + Vite
- Tailwind CSS + Motion
- Firebase Authentication (Phone Number OTP)
- Cloud Firestore (menu, orders, order_items)

## Setup

1. Install dependencies:
   `npm install`
2. Create `.env.local` and fill Firebase values.
3. Enable Firebase Authentication with Phone provider.
4. Create Firestore collections:
   - `menu_items`
   - `orders`
   - `order_items`
5. Start development server:
   `npm run dev`

## Admin Access

Admin dashboard is shown when signed-in user phone number matches:

`+917893504892`

You can override this using `VITE_ADMIN_PHONE`.

## Firestore Document Shapes

### menu_items

```json
{
  "name": "Chicken Noodles",
  "category": "Noodles",
  "price": 180,
  "spiceLevel": 4,
  "veg": false,
  "rating": 4.5,
  "image": "https://cdn.example.com/chicken-noodles.jpg",
  "description": "Wok tossed spicy chicken noodles",
  "isAvailable": true
}
```

### orders

```json
{
  "orderId": "COF1001",
  "userId": "firebaseUserId",
  "name": "Customer Name",
  "phone": "9876543210",
  "address": "Inkollu, Andhra Pradesh",
  "paymentMethod": "UPI",
  "status": "Placed",
  "total": 420,
  "createdAt": "serverTimestamp"
}
```

### order_items

```json
{
  "orderId": "COF1001",
  "itemId": "menu_item_doc_id",
  "name": "Chicken Noodles",
  "quantity": 2,
  "price": 180
}
```
