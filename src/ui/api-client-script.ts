import { fapiUrlFromPublishableKey } from "@clerk/backend/proxy"

import { escapeHtml } from "./html"

export const apiClientScript = String.raw`
let clerkLoad

export async function loadClerk() {
  const clerk = globalThis.Clerk

  if (!clerk) {
    throw new Error("Authentication could not be loaded. Refresh and try again.")
  }

  clerkLoad ??= clerk.load()
  await clerkLoad

  return clerk
}

async function getSessionToken() {
  const clerk = await loadClerk()

  const token = await clerk.session?.getToken()

  if (!token) throw new Error("Your session expired. Refresh and sign in again.")

  return token
}

export async function apiRequest(path, init = {}) {
  const headers = new Headers(init.headers)
  const token = await getSessionToken()

  headers.set("accept", "application/json")
  headers.set("authorization", "Bearer " + token)

  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  })
  const body = response.headers
    .get("content-type")
    ?.includes("application/json")
    ? await response.json()
    : null

  if (response.ok) return body

  const message =
    response.status === 401
      ? "Your session expired. Refresh and sign in again."
      : body?.error || "The request failed."

  throw new Error(message)
}
`

export function renderApiClientScripts(
  publishableKey: string,
  clientScript: string,
) {
  const frontendApi = fapiUrlFromPublishableKey(publishableKey)

  return `<script
      defer
      crossorigin="anonymous"
      data-clerk-publishable-key="${escapeHtml(publishableKey)}"
      src="${escapeHtml(frontendApi)}/npm/@clerk/clerk-js@6/dist/clerk.browser.js"></script>
    <script type="module" src="${escapeHtml(clientScript)}"></script>`
}
