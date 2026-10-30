# PDFAssess Backend Architecture (Step 1 + Sprint 2)

## Modular Monolith Structure

- `src/modules/*`: Domain-oriented modules (`auth`, `documents`, `health`, `analysis`)
- `src/shared/*`: Cross-cutting concerns (error contract, response contract, plugins)
- `src/infrastructure/*`: Infrastructure adapters (MongoDB connectivity)
- `src/routes/*`: API composition and versioning
- `tests/*`: Unit and integration test suite

## Core Architectural Decisions

1. Fastify + TypeScript strict mode for fast, type-safe API delivery.
2. Mongoose for schema validation, indexing, and document lifecycle support.
3. Zod for runtime request/config validation.
4. Cookie-based sessions with hashed session tokens in DB.
5. Dependency interfaces for Drive, storage, and PDF inspection.
6. Analysis pipeline is stage-based: render → OCR → heuristic detect → normalize → persist.
7. OCR is infrastructure-level and replaceable (`OcrService` interface).
8. Analysis processing is bounded by strict page and size limits.
9. Standard API contract:
   - Success: `{ success: true, data: ... }`
   - Error: `{ success: false, error: { code, message, details?, requestId, timestamp } }`

## Initial Domain Entities

- `users`: account identity, role, status, credential hash.
- `sessions`: server-side session tracking with token hash and expiry.
- `documents`: imported document ownership and latest version link.
- `document_versions`: immutable PDF version metadata and storage keys.

## Analysis Domain Entities

- `analysis_jobs`: one upserted job per `(documentRef + fingerprint)` range/profile.
- `analysis_detected_fields`: candidate answer regions with normalized geometry, confidence, and review status.

## PDF Analysis Architecture (Sprint 2)

- `PdfPageRendererService`: renders selected pages to PNG using configurable DPI.
- `OcrService` adapters:
   - `TesseractCliOcrService` (local CLI OCR)
   - `NoopOcrService` (test/local fallback)
- `FieldDetectorService`:
   - OCR pattern heuristics (blank lines, true/false, option markers, checkbox symbols)
   - Image-based horizontal-line fallback when OCR is missing/unavailable
- `AnalysisService`: orchestrates full analysis lifecycle, persists jobs/fields, supports repeated-analysis dedupe.

## Coordinate Mapping

- Normalized coordinates use top-left page origin.
- Values are clamped to `[0..1]` for `x`, `y`, `width`, and `height`.
- Page rotation and varying dimensions are handled through rendering viewports.

## PDF Import Architecture (Initial)

- `extractGoogleDriveFileId`: URL parsing and validation.
- `DriveClient` interface: sanctioned Drive access path only.
- `ObjectStorage` interface: private object storage abstraction.
- `DocumentImportService`: MIME checks, PDF validity checks, checksum, storage handoff.

## Security Baseline

- Helmet, strict CORS allow-list, cookie security defaults.
- Global and auth-specific rate limiting.
- No hardcoded secrets; all config from environment.

## Current Limitations

- CSRF middleware not fully enforced yet (planned in next step).
- Google Drive adapter implementation is interface-first (no live external calls in tests).
- OCR quality depends on local Tesseract availability and scanned document quality.
- Heuristics are intentionally conservative and mark uncertain regions as review-required.
- Asynchronous background workers/queues are not yet implemented (bounded synchronous local flow only).
