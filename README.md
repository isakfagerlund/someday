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
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----..."
```

Apply the local migration, then replace the seeded owner placeholder with the
Clerk user ID that owns the board:

```sh
npx wrangler d1 execute someday --local --command \
  "UPDATE boards SET clerk_owner_id = 'user_...' WHERE id = 'default'"
```

## Production setup

The GitHub repository needs these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

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
CLERK_JWT_KEY="-----BEGIN PUBLIC KEY-----..."
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
4. Copy the Secret key, Publishable key, and JWT public key into the Worker
   secrets listed above.
5. Copy the owner's Clerk `user_...` ID into D1:

   ```sh
   npx wrangler d1 execute someday --remote --command \
     "UPDATE boards SET clerk_owner_id = 'user_...' WHERE id = 'default'"
   ```

6. In Cloudflare Cache Rules, add a rule after the public HTML cache rule. Match
   `http.cookie contains "__session="` on the production hostname and set Cache
   eligibility to **Bypass cache**. Do not add the cookie to the cache key.
7. Purge the old `/` page after the first release so it immediately changes from
   the former catalog to the board list.

The seeded board uses `/isaks-board`. Change its `name` or `slug` directly in D1
if needed. New boards are manually inserted into `boards` with an ID, name,
unique slug, and Clerk owner ID.
