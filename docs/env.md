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

## Transactional communication

See [communication-architecture.md](./communication-architecture.md). Live delivery is disabled by default. It requires production `NODE_ENV`, `COMMUNICATION_ENABLED=true`, an enabled channel, and the relevant Twilio variables. Use `COMMUNICATION_DRY_RUN=true` with a selected channel enabled to resolve recipients and render messages without provider calls.
