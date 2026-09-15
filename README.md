# someday

A small server-rendered product catalog on Cloudflare Workers.

## Development

```sh
pnpm install
pnpm run dev
```

`pnpm dev` applies pending migrations to this worktree's local database before
starting Vite, including when the database is empty.

Local development uses these values in `.dev.vars`:

```sh
OPENAI_API_KEY=your-key
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----
paste-the-base64-body-here
-----END PUBLIC KEY-----"
```

Use the publishable, secret, and JWT keys from the same Clerk development
instance. After switching Clerk instances, clear the localhost cookies and
sign in again. Each new worktree needs its own `.dev.vars`.

If you want to keep the seeded board, replace its owner placeholder with the
Clerk user ID that owns it:

```sh
npx wrangler d1 execute someday --local --command \
  "UPDATE boards SET clerk_owner_id = 'user_...' WHERE id = 'default'"
```

## Production setup

The GitHub repository needs these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `SENTRY_AUTH_TOKEN` for uploading source maps to Sentry during builds

Every same-repository pull request is uploaded as a preview version of the
`someday` Worker. It reuses the secrets already attached to that Worker, so no
application secrets need to be copied to GitHub. GitHub shows the preview URL as
**View deployment** on the pull request. The preview is updated on every push,
and its tagged versions are deleted when the pull request is closed or merged.
Fork pull requests are skipped because GitHub does not expose repository secrets
to them.

Preview versions share the D1 database and R2 bucket configured in
`wrangler.jsonc` with production, so preview writes affect production data.

It also needs a `PRODUCTION_URL` repository variable. Store the OpenAI and Clerk
keys as secrets on the deployed Worker:

```sh
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put CLERK_SECRET_KEY
npx wrangler secret put CLERK_PUBLISHABLE_KEY
npx wrangler secret put CLERK_JWT_KEY
```

For the first deployment, put the key in an ignored `.env.production` file:

```sh
OPENAI_API_KEY=your-key
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----
paste-the-base64-body-here
-----END PUBLIC KEY-----"
```

Then bootstrap the Worker and its secret together:

```sh
npx wrangler deploy --secrets-file .env.production
```

Later Wrangler deployments preserve the existing Worker secrets.

## Error monitoring

Sentry reports browser errors, router error-boundary failures, server request and
function errors, and server `console.error` calls to `irewardhealth/someday`.
The server uses `@sentry/cloudflare` because it runs on Workers. Reporting is
enabled only in production builds; local errors remain visible in the console.
Expected page-access and background-removal fallbacks log warnings. Failed
image imports still report errors.

Set the GitHub Actions secret `SENTRY_AUTH_TOKEN` to enable source-map uploads.
Error reporting works without it, but stack traces may show bundled code.
For local uploads, export the token before running `pnpm run build`.

## Clerk setup

Create separate Clerk development and production instances, then configure each
one as follows:

1. Set Access mode to **Invite-only** and invite the board owner.
2. Keep the hosted Account Portal enabled. Set its sign-in fallback redirect to
   `<app-origin>/auth/redirect`.
3. Enable Apple as a social connection. Production Apple login also needs an
   Apple Services ID, Team ID, Key ID, and private key.
4. Copy the Secret key, Publishable key, and PEM JWT public key into the Worker
   secrets listed above. Keep all three PEM lines inside the quoted
   `CLERK_JWT_KEY` value. Do not use the JWKS URL or JSON document.
5. If you want to keep the seeded board, copy its owner's Clerk `user_...` ID
   into D1:

   ```sh
   npx wrangler d1 execute someday --remote --command \
     "UPDATE boards SET clerk_owner_id = 'user_...' WHERE id = 'default'"
   ```

6. No Cloudflare Cache Rule is needed. The Worker uses Workers Cache, which
   ignores zone Cache Rules, and public HTML responses send `Vary: Cookie` so
   signed-in requests never match the cached anonymous page.
7. Purge the cached `/` page when releasing a homepage redesign so visitors
   immediately see the new page.

The seeded board uses `/isaks-board`. Change its `name` or `slug` directly in D1
if needed. Invited users without a board are prompted for a board name after
sign-in. The application creates their board and derives its unique public slug.

The homepage introduces Someday with a create-board action. Owners with one board
get a direct link to it and a secondary action to create another. Owners with
multiple boards see their boards in creation order, with a product thumbnail and
item count. Signing in opens the only board, or the homepage when there are several.
Each board remains public by its URL; the homepage only lists the signed-in user's boards.

Apply the `multiple_boards` migration before using the new create-board flow.
It replaces the unique owner index with a regular index and preserves existing
boards and products. Product imports explicitly target the board being viewed.
