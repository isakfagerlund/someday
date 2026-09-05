import { clerkMiddleware } from "@clerk/tanstack-react-start/server"
import { createStart } from "@tanstack/react-start"

// Clerk reads CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY from process.env,
// which the Workers runtime fills from the Worker's secrets. The JWT key
// lets it verify sessions without a network round trip.
export const startInstance = createStart(() => ({
  requestMiddleware: [
    clerkMiddleware(({ url }) => ({
      authorizedParties: [url.origin],
      jwtKey: process.env.CLERK_JWT_KEY,
    })),
  ],
}))
