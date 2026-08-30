import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  createClerkClient: vi.fn(),
}))

vi.mock("@clerk/backend", () => ({
  createClerkClient: mocks.createClerkClient,
}))

import { addAuthHeaders, authenticateRequest } from "./auth"

const publishableKey =
  "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk"

const env = {
  CLERK_JWT_KEY: "jwt-key",
  CLERK_PUBLISHABLE_KEY: publishableKey,
  CLERK_SECRET_KEY: "sk_test_example",
} as Env

describe("authenticateRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createClerkClient.mockReturnValue({
      authenticateRequest: mocks.authenticateRequest,
    })
  })

  it("verifies a session against the request origin without fetching keys", async () => {
    const request = new Request("https://someday.example/isaks-board")
    mocks.authenticateRequest.mockResolvedValue({
      headers: new Headers(),
      isAuthenticated: true,
      signInUrl: "https://accounts.example.com/sign-in",
      status: "signed-in",
      toAuth: () => ({ userId: "user_owner" }),
    })

    const result = await authenticateRequest(request, env)

    expect(mocks.createClerkClient).toHaveBeenCalledWith({
      jwtKey: "jwt-key",
      publishableKey,
      secretKey: "sk_test_example",
    })
    expect(mocks.authenticateRequest).toHaveBeenCalledWith(request, {
      authorizedParties: ["https://someday.example"],
      jwtKey: "jwt-key",
    })
    expect(result.request?.userId).toBe("user_owner")
  })

  it("builds an Account Portal link when Clerk has no configured sign-in URL", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      headers: new Headers(),
      isAuthenticated: false,
      signInUrl: "",
      status: "signed-out",
    })

    const result = await authenticateRequest(
      new Request("http://localhost:8787/"),
      env,
    )

    expect(result.request?.signInUrl).toBe(
      "https://example.accounts.dev/sign-in?redirect_url=http%3A%2F%2Flocalhost%3A8787%2Fauth%2Fredirect",
    )
  })

  it("returns Clerk's handshake redirect", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      headers: new Headers({ location: "https://clerk.example/handshake" }),
      status: "handshake",
    })

    const result = await authenticateRequest(
      new Request("https://someday.example/isaks-board"),
      env,
    )

    expect(result.response?.status).toBe(307)
    expect(result.response?.headers.get("location")).toBe(
      "https://clerk.example/handshake",
    )
  })

  it("keeps each refreshed session cookie separate", () => {
    const headers = new Headers()
    headers.append("set-cookie", "__session=one; Path=/")
    headers.append("set-cookie", "__client_uat=two; Path=/")

    const response = addAuthHeaders(new Response("ok"), headers)

    expect(response.headers.getSetCookie()).toEqual([
      "__session=one; Path=/",
      "__client_uat=two; Path=/",
    ])
  })
})
