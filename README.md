# someday

A small server-rendered product catalog on Cloudflare Workers.

## Development

```sh
npm install
npm run db:migrate:local
npm run dev
```

Local development uses these values in `.dev.vars`:

```sh
OPENAI_API_KEY=your-key
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----
paste-the-base64-body-here
-----END PUBLIC KEY-----"
```

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
7. Purge the old `/` page after the first release so it immediately changes from
   the former catalog to the board list.

The seeded board uses `/isaks-board`. Change its `name` or `slug` directly in D1
if needed. Invited users without a board are prompted for a board name after
sign-in. The application creates their board and derives its unique public slug.
