import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  insertBoard: vi.fn(),
  getBoardByOwnerId: vi.fn(),
  getBoardBySlug: vi.fn(),
  getUserDisplayName: vi.fn(),
  listBoards: vi.fn(),
  listProducts: vi.fn(),
}))

vi.mock("./auth", () => ({
  addAuthHeaders: (response: Response) => response,
  authenticateRequest: mocks.authenticateRequest,
  getUserDisplayName: mocks.getUserDisplayName,
}))
vi.mock("./db/boards", () => ({
  getBoardByOwnerId: mocks.getBoardByOwnerId,
  getBoardBySlug: mocks.getBoardBySlug,
  getProductBoard: vi.fn(),
  insertBoard: mocks.insertBoard,
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

const clerkEnv = {
  CLERK_PUBLISHABLE_KEY: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
} as Env

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
    mocks.getBoardByOwnerId.mockResolvedValue(undefined)
    mocks.getUserDisplayName.mockResolvedValue("Isak")
    mocks.insertBoard.mockImplementation(
      async (_database: D1Database, newBoard: typeof board) => newBoard,
    )
    mocks.listBoards.mockResolvedValue([board])
    mocks.listProducts.mockResolvedValue([product])
  })

  it("keeps the anonymous board public and free of management code", async () => {
    const response = await worker.fetch(
      new Request("https://someday.example/isaks-board"),
      clerkEnv,
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
      clerkEnv,
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
      clerkEnv,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(html).not.toContain("data-open-import-dialog")
    expect(html).not.toContain("/catalog.js")
  })

  it("asks a signed-in user without a board to create one", async () => {
    setUser("user_other")

    const response = await worker.fetch(
      new Request("https://someday.example/"),
      clerkEnv,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(html).toContain('<span class="home-user">Isak</span>')
    expect(html).toContain('<dialog class="board-dialog"')
    expect(html).toContain('data-unavailable-slugs="api,auth,catalog,health,images,isaks-board"')
    expect(html).toContain('action="/api/boards"')
    expect(html).toContain(
      'https://someday.fyi/<strong data-board-slug-preview>your-board</strong>',
    )
    expect(html).toContain('/home.js')
    expect(html).not.toContain(">Sign in</a>")
  })

  it("links an owner to their board without showing onboarding", async () => {
    setUser("user_owner")

    const response = await worker.fetch(
      new Request("https://someday.example/"),
      clerkEnv,
      {} as ExecutionContext,
    )
    const html = await response.text()

    expect(html).toContain(
      '<a class="home-user" href="/isaks-board">Isak</a>',
    )
    expect(html).not.toContain('<dialog class="board-dialog"')
    expect(html).not.toContain('/home.js')
  })

  it("creates a board with a unique slug and redirects to it", async () => {
    setUser("user_other")
    mocks.listBoards.mockResolvedValue([
      board,
      { ...board, id: "another", slug: "cafe-finds" },
    ])

    const response = await worker.fetch(
      new Request("https://someday.example/api/boards", {
        method: "POST",
        body: new URLSearchParams({ name: "Café Finds" }),
      }),
      { DB: {} } as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      "https://someday.example/cafe-finds-2",
    )
    expect(mocks.insertBoard).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        name: "Café Finds",
        slug: "cafe-finds-2",
        clerkOwnerId: "user_other",
      }),
    )
  })

  it("returns the new board slug to the authenticated client", async () => {
    setUser("user_other")

    const response = await worker.fetch(
      new Request("https://someday.example/api/boards", {
        method: "POST",
        body: JSON.stringify({ name: "Night Finds" }),
        headers: { "content-type": "application/json" },
      }),
      { DB: {} } as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(201)
    await expect(response.json()).resolves.toEqual({ slug: "night-finds" })
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
