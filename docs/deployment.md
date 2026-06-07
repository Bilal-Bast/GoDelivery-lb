---
id: deployment
title: Deployment
---

Notes for production deployment:

- Provide `MONGO_URL` and `JWT_SECRET` via environment configuration.
- Add health probes (`/health`, `/ready`) in future iterations.
- Run behind a reverse proxy (NGINX) or platform (Heroku, DigitalOcean App Platform).
- Use process manager (PM2) or containerize with Docker.
