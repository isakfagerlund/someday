import { createRouter } from "@tanstack/react-router"

import { routeTree } from "./routeTree.gen"

export function getRouter() {
  return createRouter({ routeTree, defaultPreload: false })
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

declare module "@tanstack/react-start" {
  interface Register {
    // The Worker entry passes its ExecutionContext so mutations can purge
    // Workers Cache by tag.
    server: { requestContext: { ctx: ExecutionContext } }
  }
}
