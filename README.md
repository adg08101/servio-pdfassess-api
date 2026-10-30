# PDFAssess API Backend

Production-oriented backend foundation for PDFAssess built as a modular monolith with Node.js, TypeScript, Fastify, and MongoDB.

## Milestone Status

This repository currently implements **Step 1 (Foundation)** and includes **authentication infrastructure** plus a **clear PDF import architecture skeleton**.

### Implemented

- Strict TypeScript + Fastify app bootstrap
- Security plugins: Helmet, CORS, HTTP-only cookies, rate limiting
- MongoDB connectivity with Mongoose lifecycle hooks
- Standardized API response and error contracts
- Versioned API base: `/api/v1`
- Health endpoint: `GET /api/v1/health`
- Auth infrastructure:
  - User and session schemas
  - Register/login/logout/me endpoints
  - Argon2id password hashing
  - Cookie-based sessions with hashed tokens
  - Role guard scaffold (`ADMIN`, `STUDENT`)
- PDF import architecture:
  - Google Drive URL parser and validation
  - Drive and object storage interfaces
  - Import service orchestration contract

### Not Yet Implemented

- Complete domain model set (`assessments`, `attempts`, `responses`, etc.)
- CSRF middleware enforcement for all state-changing endpoints
- Full Google Drive adapter + object storage adapter wiring
- PDF analysis pipeline and assessment workflows

## Folder Structure

```text
src/
  app.ts
  server.ts
  config/
  infrastructure/
  modules/
    auth/
    documents/
    health/
  routes/
  scripts/
  shared/
tests/
docs/
```

## Quick Start

1. Copy env file:

```bash
cp .env.example .env
```

1. Start MongoDB:

```bash
docker compose up -d
```

1. Install dependencies:

```bash
npm install
```

1. Run API in dev mode:

```bash
npm run dev
```

1. Run tests:

```bash
npm test
```

## Scripts

- `npm run dev` — start in watch mode
- `npm run build` — compile production build
- `npm run start` — run compiled server
- `npm run typecheck` — run TS type checks
- `npm run lint` — lint code
- `npm run format` — format code
- `npm run test` — run tests
- `npm run seed` — seed admin and student users

## API Contract

Success:

```json
{
  "success": true,
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {},
    "requestId": "req-123",
    "timestamp": "2026-10-30T00:00:00.000Z"
  }
}
```
