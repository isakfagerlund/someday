# ADR 0007: Drizzle schema, queries, and migrations

Status: Accepted

## Context

D1 provides SQLite storage and migration commands, but the application still needs a clear schema source, typed query results, and reviewable schema changes. The known model already contains boards and products and is expected to gain accounts later.

## Decision

Use Drizzle ORM as the TypeScript schema definition and runtime D1 query layer. Use Drizzle Kit to generate versioned SQL migration files from schema changes.

Use Wrangler to apply the generated migrations to local and remote D1 databases. Configure D1's migration pattern for Drizzle's generated directory layout when needed.

The continuous deployment workflow applies pending production migrations before deploying code that needs them. Production migrations must remain backward-compatible with the previously deployed Worker.

Check generated SQL and Drizzle schema snapshots into source control. Review generated SQL before applying it. Do not use `drizzle-kit push` against production.

## Expected structure

```text
src/
└── db/
    ├── schema.ts
    └── index.ts
drizzle/
├── 0000_initial/
│   ├── migration.sql
│   └── snapshot.json
└── ...
drizzle.config.ts
wrangler.jsonc
```

## Migration flow

```text
Edit src/db/schema.ts
  -> drizzle-kit generate
  -> inspect generated SQL
  -> wrangler d1 migrations apply locally
  -> run tests
  -> wrangler d1 migrations apply remotely during deployment
```

## Consequences

- The TypeScript schema is the database schema source of truth.
- Runtime inserts and selects use the same column definitions as migrations.
- SQL migrations remain visible and reviewable.
- Drizzle adds a runtime dependency, but public requests normally read cached HTML rather than query D1.
- Wrangler remains responsible for Cloudflare environment selection and migration application.
- Custom data migrations can still use explicit SQL files.

## Alternatives considered

- Raw SQL plus Wrangler migrations would have fewer dependencies but would duplicate more schema and result typing in application code.
- Drizzle Kit only would structure migrations but leave runtime query types and schema usage split between two approaches.
- `drizzle-kit push` is convenient for disposable development databases but does not provide the checked-in production migration history required here.
