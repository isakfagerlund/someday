# someday

A small server-rendered product catalog on Cloudflare Workers.

## Development

```sh
npm install
npm run db:migrate:local
npm run dev
```

Local product imports require `OPENAI_API_KEY` in `.dev.vars`.

## Production setup

The GitHub repository needs these Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

It also needs a `PRODUCTION_URL` repository variable. Store `OPENAI_API_KEY` as
a secret on the deployed Worker.

For the first deployment, put the key in an ignored `.env.production` file:

```sh
OPENAI_API_KEY=your-key
```

Then bootstrap the Worker and its secret together:

```sh
npx wrangler deploy --secrets-file .env.production
```

Later Wrangler deployments preserve the existing Worker secret.
