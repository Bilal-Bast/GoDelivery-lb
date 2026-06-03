# GoDelivery-lb

Repository scaffold for GoDelivery admin dashboard and API.

## Quickstart

1. Install dependencies

```bash
npm install
```

2. Copy environment example and set secrets

```bash
copy .env.example .env    # Windows (PowerShell)
# or
cp .env.example .env      # Unix
```

3. Run in development

```bash
npm run dev
```

## Docs site (Docusaurus)

A simple Docusaurus docs scaffold is included (`docusaurus.config.js`, `sidebars.js`, and `docs/`).

To run the docs locally:

```bash
# install Docusaurus dependencies
npm install @docusaurus/core @docusaurus/preset-classic @docusaurus/theme-classic

# start the docs site (from repo root)
npx docusaurus start
```

The docs live under `docs/` and include an OpenAPI skeleton at `docs/openapi.yaml`.

## API

- Server entry: `app.js`
- Main routes: `src/routes/*`
- Controllers: `src/controllers/*`
- Models: `src/models/*`

## Next steps

- Complete `docs/openapi.yaml` with all endpoints and schemas.
- Add CI to validate docs build and run tests.
