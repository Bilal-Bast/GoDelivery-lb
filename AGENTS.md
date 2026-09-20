# Repository Guidelines

## Project Structure & Module Organization

This is an Express 5 delivery-management app using Prisma and PostgreSQL. The server entry point is `app.js`. Backend code lives in `src/`: `routes/` defines API routers, `controllers/` contains domain logic, `middleware/` contains auth, validation, logging, and error handling, and `services/` holds seeders and page-data helpers. Pug templates are in `src/views/`, browser JavaScript and CSS are in `src/public/`, database schema/migrations are in `prisma/`, and docs are under `docs/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies and run `prisma generate` via `postinstall`.
- `npm run dev`: start the local server with `nodemon app.js`.
- `npm start`: run the Node server.
- `npx prisma generate`: regenerate the Prisma client after schema changes.
- `npx prisma migrate dev`: create/apply local database migrations.
- `npm test`: currently a placeholder that exits with an error; add real tests before relying on it.

The app requires `DATABASE_URL` and `JWT_SECRET`; copy `.env.example` to `.env` for local setup.

## Coding Style & Naming Conventions

Use ES modules, matching the existing `import`/`export` style. Keep indentation with tabs, as used in the current JavaScript files. Prefer descriptive controller names such as `createPayment`, `getDriverStats`, and `updateOrderStatus`. Route files use `*.routes.js`; middleware uses `*.middleware.js`.

Keep API payload compatibility in mind: orders use compact fields such as `m`, `c`, `pr`, and numeric status `s`.

## Testing Guidelines

No test framework is currently configured. When adding tests, prefer focused integration tests around route behavior and Prisma-backed business rules. Cover high-risk flows first: authentication, order status transitions, driver collection, merchant payment, prepaid balances, and returns.

## Commit & Pull Request Guidelines

Recent commits follow Conventional Commit style, especially `fix(scope): message`, such as `fix(payment): add customer phone number to payment PDF`. Use concise scopes like `orders`, `finance`, `print`, or `auth`.

Pull requests should describe the user-facing behavior change, database migration impact if any, validation performed, and screenshots for Pug/CSS/browser UI changes. Link related issues when available.

## Security & Configuration Tips

Do not commit `.env` or secrets. JWT auth is cookie- and bearer-token based; preserve role checks with `authMiddleware`, `authorize`, `pageAuth`, `adminOnly`, and `driverOnly`. Use Prisma queries and existing validators rather than ad hoc SQL or trusting client-supplied money totals.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
