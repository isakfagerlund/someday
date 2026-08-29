# ADR 0008: TypeScript-only code

Status: Accepted

## Context

The Worker, importer, database schema, migration configuration, rendering helpers, and tests share domain types. Mixing JavaScript and TypeScript would create an unnecessary boundary in a small codebase.

## Decision

Write all authored application, tooling, configuration code that supports TypeScript, and tests in strict TypeScript. Do not add authored JavaScript source files.

Keep non-code assets in their native formats:

- CSS for styling
- SQL for generated and custom migrations
- HTML strings or typed rendering functions for Worker-rendered pages
- JSONC for Wrangler configuration

Generate Cloudflare binding types from the Wrangler configuration rather than maintaining handwritten environment binding types.

## Consequences

- The Worker, Drizzle schema, importer, and tests share checked types.
- Strict compiler settings catch nullable extraction results and incomplete product candidates before runtime.
- Small scripts use TypeScript instead of creating an untyped scripts directory.
- TypeScript does not justify adding a frontend framework or client-side runtime.
