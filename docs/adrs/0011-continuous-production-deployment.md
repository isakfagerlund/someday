# ADR 0011: Continuous production deployment from main

Status: Accepted

## Context

Manual releases make a small personal application annoying to maintain and allow production to drift from the main branch. The repository is hosted on GitHub and the application includes a Worker, static assets, D1 migrations, and an OpenAI secret.

## Proposed decision

Treat every push to `main`, including merge commits, as a production release candidate. Use one GitHub Actions workflow committed to the repository. Do not require a manual approval or a separate release command.

Run releases serially with cancellation disabled so two D1 migration and deployment jobs cannot race.

## Release pipeline

```text
Push to main
  -> install locked dependencies
  -> verify generated Cloudflare binding types
  -> typecheck
  -> run tests
  -> validate the Worker build
  -> apply pending D1 migrations
  -> deploy the Worker and static assets
  -> request a production health endpoint
```

Do not configure path filters. Documentation-only pushes may produce an identical deployment, but the rule remains simple: production follows `main`.

## Migration rule

Apply pending D1 migrations before deploying code that needs them. Every migration must be backward-compatible with the currently deployed Worker so a failed code deployment does not break the previous version.

Use expand-and-contract changes when removing or changing existing fields:

1. Add the new schema while old code still works.
2. Deploy code that uses the new schema.
3. Remove the old schema in a later release after it is unused.

Do not attempt automatic down migrations. Cloudflare captures a backup when applying D1 migrations, but restoring data remains an exceptional manual recovery action.

## Secrets and permissions

Store the Cloudflare account ID and a narrowly scoped Cloudflare API token in GitHub Actions secrets. Store the OpenAI API key as a Worker secret managed by Cloudflare, not as a build output or repository value.

Store the deployed Worker origin in the GitHub Actions repository variable
`PRODUCTION_URL`. The release uses it for the final `/health` request.

The deployment token needs only the permissions required to apply migrations and deploy this Worker.

## Consequences

- A successful push to `main` reaches production without human action.
- Failed checks or migrations stop the release before deployment.
- A failed deployment after a successful migration leaves an expanded schema that the previous Worker must tolerate.
- The complete release procedure is reviewed and versioned with the code.
- Production deployment history maps directly to commits on `main`.
- Rollback can restore a previous Worker version, but database rollback is not automatic.

## Alternatives considered

- Cloudflare Workers Builds can deploy on every push with less repository configuration, but the ordered migration, verification, and smoke-test steps would live partly in dashboard configuration.
- Manual Wrangler deployment is simpler to set up once but violates the maintenance requirement.
