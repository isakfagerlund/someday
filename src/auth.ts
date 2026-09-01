import { createClerkClient } from "@clerk/backend"
import { createRedirect } from "@clerk/backend/internal"

interface AuthenticatedRequest {
  headers: Headers
  signInUrl: string
  userId: string | null
}

export type RequestAuth =
  | { request: AuthenticatedRequest; response?: never }
  | { request?: never; response: Response }

function createClerk(env: Env) {
  return createClerkClient({
    jwtKey: env.CLERK_JWT_KEY,
    publishableKey: env.CLERK_PUBLISHABLE_KEY,
    secretKey: env.CLERK_SECRET_KEY,
  })
}

function getAppUrl(request: Request) {
  const url = new URL(request.url)

  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    url.protocol = "https:"
  }

  return url
}

export async function authenticateRequest(
  request: Request,
  env: Env,
): Promise<RequestAuth> {
  const clerk = createClerk(env)
  const appUrl = getAppUrl(request)
  const state = await clerk.authenticateRequest(request, {
    authorizedParties: [appUrl.origin],
    jwtKey: env.CLERK_JWT_KEY,
  })
  const location = state.headers.get("location")

  if (location) {
    return {
      response: new Response(null, { status: 307, headers: state.headers }),
    }
  }

  if (state.status === "handshake") {
    throw new Error("Clerk handshake did not include a redirect")
  }

  return {
    request: {
      headers: state.headers,
      signInUrl: createRedirect({
        baseUrl: appUrl.href,
        publishableKey: env.CLERK_PUBLISHABLE_KEY,
        redirectAdapter: (url) => url,
        signInUrl: state.signInUrl,
      }).redirectToSignIn({
        returnBackUrl: new URL("/auth/redirect", appUrl),
      }),
      userId: state.isAuthenticated ? state.toAuth().userId : null,
    },
  }
}

export async function getUserDisplayName(userId: string, env: Env) {
  const user = await createClerk(env).users.getUser(userId)

  return (
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Signed in"
  )
}

export function addAuthHeaders(response: Response, authHeaders: Headers) {
  if ([...authHeaders].length === 0) return response

  const headers = new Headers(response.headers)

  for (const [name, value] of authHeaders) {
    if (name !== "set-cookie" && !headers.has(name)) headers.set(name, value)
  }

  for (const cookie of authHeaders.getSetCookie()) {
    headers.append("set-cookie", cookie)
  }

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  })
}
