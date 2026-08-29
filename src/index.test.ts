import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getBoardByOwnerId: vi.fn(),
  getBoardBySlug: vi.fn(),
  listBoards: vi.fn(),
  listProducts: vi.fn(),
}))

vi.mock("./auth", () => ({
  addAuthHeaders: (response: Response) => response,
  authenticateRequest: mocks.authenticateRequest,
}))
vi.mock("./db/boards", () => ({
  getBoardByOwnerId: mocks.getBoardByOwnerId,
  getBoardBySlug: mocks.getBoardBySlug,
  getProductBoard: vi.fn(),
  listBoards: mocks.listBoards,
}))
vi.mock("./db/products", () => ({
  deleteProduct: vi.fn(),
  listProducts: mocks.listProducts,
  updateProduct: vi.fn(),
}))

import worker from "./index"

const board = {
  id: "default",
  name: "someday",
  slug: "isaks-board",
  clerkOwnerId: "user_owner",
}

const product = {
  id: "product-id",
  sourceUrl: "https://shop.example/product",
  name: "Product",
  brand: "Shop",
  category: "Other" as const,
  originalImageUrl: "",
  processedImageKey: "",
  backgroundRemoved: false,
  subjectScale: 0.8,
  subjectPosition: { x: 0.5, y: 0.5 },
}

function setUser(userId: string | null) {
  mocks.authenticateRequest.mockResolvedValue({
    request: {
      headers: new Headers(),
      signInUrl: "https://accounts.example.com/sign-in",
      userId,
    },
  })
}

describe("board access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUser(null)
    mocks.getBoardBySlug.mockResolvedValue(board)
    mocks.listBoards.mockResolvedValue([board])
    mocks.listProducts.mockResolvedValue([product])
  })

  it("keeps the anonymous board public and free of management code", async () => {
    const response = await worker.fetch(
      new Request("https://someday.example/isaks-board"),
      {} as Env,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(response.headers.get("cloudflare-cdn-cache-control")).toContain(
      "public",
    )
    expect(html).not.toContain("data-open-import-dialog")
    expect(html).not.toContain("/catalog.js")
  })

  it("renders management controls only for the board owner", async () => {
    setUser("user_owner")

    const response = await worker.fetch(
      new Request("https://someday.example/isaks-board"),
      {} as Env,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(html).toContain("data-open-import-dialog")
    expect(html).toContain("data-edit-product")
    expect(html).toContain('/catalog.js')
  })

  it("keeps another signed-in user private without showing controls", async () => {
    setUser("user_other")

    const response = await worker.fetch(
      new Request("https://someday.example/isaks-board"),
      {} as Env,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(html).not.toContain("data-open-import-dialog")
    expect(html).not.toContain("/catalog.js")
  })

  it("rejects an anonymous mutation", async () => {
    const response = await worker.fetch(
      new Request("https://someday.example/api/products", {
        method: "POST",
        body: JSON.stringify({ url: "https://shop.example/product" }),
        headers: { "content-type": "application/json" },
      }),
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
  })
})
