---
id: env
title: Environment Variables
---

Required environment variables (see `.env.example`):

- `MONGO_URL` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret

Optional development variables:

- `PORT` - server port (default 3000)
- `SUPER_ADMIN_*` - seeding super admin user credentials

Security: never commit `.env` or production secrets to source control.
