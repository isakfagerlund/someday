import { createFileRoute, redirect } from "@tanstack/react-router"

import { loadOwnerBoardPath } from "../server/pages"

// Where Clerk sends people after signing in: their board, or home.
export const Route = createFileRoute("/auth/redirect")({
  loader: async () => {
    throw redirect({ href: await loadOwnerBoardPath(), statusCode: 303 })
  },
})
