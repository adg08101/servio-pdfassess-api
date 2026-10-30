# PDFAssess API Backend

Production-oriented backend foundation for PDFAssess built as a modular monolith with Node.js, TypeScript, Fastify, and MongoDB.

## Milestone Status

This repository now implements:

- **Step 1 (Foundation)**
- **Sprint 2 foundation for PDF Analysis and interactive field detection**

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
- PDF analysis module:
  - Page rendering for selected ranges with configurable DPI
  - OCR abstraction (`tesseract-cli` adapter + noop adapter)
  - Deterministic field detection heuristics with confidence + review flags
  - Normalized coordinate mapping (top-left origin)
  - Analysis job and detected-field persistence with dedupe fingerprints
  - Analysis endpoints:
    - `POST /api/v1/documents/:id/analyze`
    - `GET /api/v1/documents/:id/analysis`
    - `GET /api/v1/documents/:id/fields`
    - `PATCH /api/v1/documents/:id/fields/:fieldId`
  - Optional annotated preview image generation

### Not Yet Implemented

- Complete domain model set (`assessments`, `attempts`, `responses`, etc.)
- CSRF middleware enforcement for all state-changing endpoints
- Full Google Drive adapter + object storage adapter wiring
- Full assessment lifecycle, attempts, grading, and reporting modules

## Folder Structure

```text
src/
  app.ts
  server.ts
  config/
  infrastructure/
  modules/
    auth/
    analysis/
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
- `npm run sample:register` — register the local sample workbook as a document version
- `npm run sample:analyze` — analyze sample PDF pages 6–8 and generate preview images

## Coordinate Convention

- Coordinates are normalized to `[0..1]`.
- Origin is **top-left** of the rendered page.
- `x` and `y` are relative offsets; `width` and `height` are relative sizes.
- Coordinates account for page rotation through the rendering viewport.

## OCR Notes

- Default adapter: `tesseract-cli` (`OCR_ADAPTER=tesseract-cli`).
- Requires local Tesseract executable in `PATH` (or set `OCR_TESSERACT_BIN`).
- If OCR is unavailable, analysis continues with image-based fallback detection and marks fields for review.

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
