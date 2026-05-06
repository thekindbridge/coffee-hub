# Coffee Hub Privacy Policy

Last updated: May 6, 2026

Coffee Hub ("Coffee Hub", "we", "our", or "us") provides coffee ordering, order tracking, delivery operations, and store administration services through our Android app, web app, and related backend services.

This Privacy Policy explains what information we collect, how we use it, how we protect it, and what choices users have.

## 1. Information we collect

We may collect the following categories of information:

- Account and identity data: phone number, Firebase Authentication user ID, role assignment, and optional profile details such as name and email.
- Order and delivery data: cart items, order history, delivery address, delivery instructions, order status, assigned delivery agent details, and timestamps related to ordering and delivery.
- Location data: approximate or precise device location when a customer shares location for checkout or when delivery tracking is used.
- Device and app data: app version, browser or webview type, operating system, IP-based network metadata, and service-generated technical identifiers used for security, spam prevention, and service reliability.
- Support and contact data: information you send when contacting Coffee Hub for help, feedback, or account-related requests.

## 2. Why we collect this information

We use the data above to:

- create and maintain user accounts;
- verify phone numbers through one-time password (OTP) login;
- let customers browse the menu, place orders, and track deliveries;
- let admins manage menu items, orders, timing controls, and operational access;
- let delivery agents receive assigned deliveries and update delivery progress;
- secure the service, prevent abuse, detect fraud, and enforce role-based access controls;
- improve service reliability, investigate issues, and respond to support requests.

## 3. Phone number and OTP verification

Coffee Hub uses Firebase Authentication for OTP-based phone sign-in.

- Your phone number is used to send and verify OTP codes.
- OTP-related verification requests may be processed by Google and Firebase anti-abuse systems.
- Coffee Hub also applies rate-limiting and cooldown controls to reduce OTP spam and misuse.

## 4. Location data

Coffee Hub requests location access only for user-facing order and delivery features.

- Customer location may be used during checkout to confirm a delivery destination and support live order tracking.
- Delivery-related location may be used to show live route progress for active deliveries.
- Coffee Hub does not require background location for the Android release reviewed in this repository.

You can deny location access, but some delivery and live-tracking features may not work correctly.

## 5. Order, profile, and role data

Coffee Hub stores operational records in Firebase Firestore, including:

- customer profile details and saved delivery information;
- order items, totals, statuses, and timestamps;
- delivery session details and live delivery updates;
- access and role records for customer, admin, and delivery agent workflows.

Role-based access is enforced using application logic, backend checks, and Firestore security rules.

## 6. Third-party services and processors

Coffee Hub uses trusted service providers to operate the app, including:

- Google Firebase Authentication for sign-in and account verification;
- Google Cloud Firestore for application data storage and real-time sync;
- Google Maps or related Google location services for map and route experiences where enabled;
- Vercel-hosted backend APIs and hosting infrastructure for server-side application behavior.

Coffee Hub does not sell personal data.

## 7. Data sharing

Coffee Hub shares data only as needed to run the service, fulfill orders, secure the platform, or comply with law.

Examples include:

- sharing authentication and anti-abuse data with Google Firebase;
- sharing map and routing requests with Google services when location-based features are used;
- sharing limited operational data with admins and delivery agents when required to fulfill an order.

## 8. Security measures

Coffee Hub uses reasonable technical and organizational safeguards, including:

- encrypted network transport through HTTPS and Firebase-managed secure connections;
- authentication and role-based authorization controls;
- Firestore security rules that restrict access by user identity and role;
- server-side validation for sensitive order and role-management actions;
- OTP request throttling and abuse controls.

No method of transmission or storage is perfectly secure, but we work to reduce risk and limit unnecessary access.

## 9. Data retention

Coffee Hub retains data only for as long as reasonably necessary to:

- operate ordering and delivery services;
- maintain account records and order history;
- investigate abuse, fraud, support issues, or disputes;
- comply with legal, tax, or operational obligations.

Some information may be deleted sooner upon request, while some transactional or security records may be retained for a limited period where required for legitimate business or legal reasons.

## 10. User rights and choices

Depending on your location and applicable law, you may have rights to:

- access or update your account details;
- request deletion of your account and associated personal data;
- withdraw optional permissions such as location access;
- contact Coffee Hub with privacy or support questions.

Account deletion requests can be initiated through the Coffee Hub account deletion page or by contacting Coffee Hub support using the details below. Identity verification may be required before deletion is processed.

## 11. Children's privacy

Coffee Hub is intended for general food-ordering use and is not designed for children under 13.

## 12. Contact information

For privacy, support, or account-related requests, contact:

- Email: thekindbridge@gmail.com
- Phone: +91 7893504892
- Service name: Coffee Hub
- Location: Inkollu, Andhra Pradesh, India

## 13. Changes to this policy

Coffee Hub may update this Privacy Policy from time to time. Updated versions should be published at a public URL before they are relied on for production Play Store disclosures.
