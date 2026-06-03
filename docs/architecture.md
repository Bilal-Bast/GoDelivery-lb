---
id: architecture
title: Architecture Overview
---

High-level architecture:

- Express server renders SSR pages with Pug and exposes JSON REST API under `/api/*`.
- Mongoose models store `User`, `Order`, `OrderHistory`, `Location`, `DriverCollection`, `MerchantPayment`.
- Authentication: JWT stored in an HTTP-only cookie for SSR and `Authorization: Bearer <token>` for API clients.
- Key services: `page-data.service.js`, seeders for locations and super-admin.

Include diagrams and deployment notes here.
