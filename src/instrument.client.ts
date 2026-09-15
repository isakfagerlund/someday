import * as Sentry from "@sentry/tanstackstart-react"

Sentry.init({
  dsn: "https://2a36ca698eaee124eb58ec3ab5dfa7c4@o180940.ingest.us.sentry.io/4512047167045632",
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
})
