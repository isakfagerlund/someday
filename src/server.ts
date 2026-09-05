import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server"

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

    return start(request, { context: { ctx } })
  },
} satisfies ExportedHandler<Env>
