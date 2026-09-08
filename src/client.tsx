import "./instrument.client"

import { reactErrorHandler } from "@sentry/tanstackstart-react"
import { StartClient } from "@tanstack/react-start/client"
import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
    { onUncaughtError: reactErrorHandler(), onRecoverableError: reactErrorHandler() },
  )
})
