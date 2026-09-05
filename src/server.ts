import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server"

import { homeCacheHeaders, privateHtmlCacheHeaders } from "./catalog-cache"
import { serveProductImage } from "./images"

const start = createStartHandler(defaultStreamHandler)

// Images and health bypass the framework so they keep their own headers
// and never pay for a React render.
export default {
  async fetch(request, env, ctx): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (pathname === "/health") {
      return Response.json(
        { status: "ok" },
        { headers: { "cache-control": "no-store" } },
      )
    }

    if (
      pathname.startsWith("/images/") &&
      (request.method === "GET" || request.method === "HEAD")
    ) {
      return serveProductImage(request, env.IMAGE_BUCKET)
    }

    const response = await start(request, { context: { ctx } })

    return response.status === 404 ? withNotFoundCache(request, response) : response
  },
} satisfies ExportedHandler<Env>

// Unknown slugs are cached like the home page so bots probing random paths
// do not run the Worker every time. Requests with cookies stay private.
function withNotFoundCache(request: Request, response: Response) {
  const headers = new Headers(response.headers)
  const cacheHeaders = request.headers.has("cookie")
    ? privateHtmlCacheHeaders
    : homeCacheHeaders

  for (const [name, value] of Object.entries(cacheHeaders)) {
    headers.set(name, value)
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}
