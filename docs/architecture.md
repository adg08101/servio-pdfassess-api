# PDFAssess Backend Architecture (Step 1 Milestone)

## Modular Monolith Structure

- `src/modules/*`: Domain-oriented modules (`auth`, `documents`, `health`)
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
6. Standard API contract:
   - Success: `{ success: true, data: ... }`
   - Error: `{ success: false, error: { code, message, details?, requestId, timestamp } }`

## Initial Domain Entities

- `users`: account identity, role, status, credential hash.
- `sessions`: server-side session tracking with token hash and expiry.
- `documents`: imported document ownership and latest version link.
- `document_versions`: immutable PDF version metadata and storage keys.

## PDF Import Architecture (Initial)

- `extractGoogleDriveFileId`: URL parsing and validation.
- `DriveClient` interface: sanctioned Drive access path only.
- `ObjectStorage` interface: private object storage abstraction.
- `DocumentImportService`: MIME checks, PDF validity checks, checksum, storage handoff.

## Security Baseline

- Helmet, strict CORS allow-list, cookie security defaults.
- Global and auth-specific rate limiting.
- No hardcoded secrets; all config from environment.

## Known Step-1 Limitations

- CSRF middleware not fully enforced yet (planned in next step).
- Google Drive adapter implementation is interface-first (no live external calls in tests).
- PDF analysis is not implemented in this milestone.
