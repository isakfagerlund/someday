import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getBoardById: vi.fn(),
  importProduct: vi.fn(),
  previewProduct: vi.fn(),
  purgeBoardCache: vi.fn(),
}))

// Run the server handler and its validator without an HTTP/auth transport.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (validator: { parse: (data: unknown) => unknown } | ((data: unknown) => unknown)) => ({
      handler: (handler: (input: unknown) => unknown) => ({ data }: { data: unknown }) =>
        handler({ data: typeof validator === "function" ? validator(data) : validator.parse(data), context: { ctx: {} } }),
    }),
  }),
}))
vi.mock("@clerk/tanstack-react-start/server", () => ({ auth: mocks.auth }))
vi.mock("../db/boards", () => ({ getBoardById: mocks.getBoardById, getProductBoard: vi.fn() }))
vi.mock("../import/import-product", () => ({ createProduct: mocks.importProduct, previewProduct: mocks.previewProduct }))
vi.mock("../catalog-cache", () => ({ purgeBoardCache: mocks.purgeBoardCache }))

import { createProduct, previewProduct } from "./products"

function productForm(boardId: string) {
  const form = new FormData()
  for (const [key, value] of Object.entries({
    boardId,
    sourceUrl: "https://example.com/lamp",
    canonicalUrl: "https://example.com/lamp",
    name: "Lamp",
    brand: "Example",
    category: "Home",
    imageUrl: "https://example.com/lamp.jpg",
    method: "direct",
  })) form.set(key, value)
  return form
}

describe("imports target an owned board", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.auth.mockResolvedValue({ userId: "owner" })
    mocks.getBoardById.mockImplementation((_database, id) => Promise.resolve(
      id === "missing" ? undefined : { id, clerkOwnerId: id === "someone-elses-board" ? "someone-else" : "owner" },
    ))
    mocks.importProduct.mockResolvedValue({ id: "product" })
  })

  it("saves to board B and purges B even when the owner also has board A", async () => {
    await createProduct({ data: productForm("board-b") })
    expect(mocks.getBoardById).toHaveBeenCalledWith(expect.anything(), "board-b")
    expect(mocks.importProduct).toHaveBeenCalledWith(expect.anything(), "board-b", expect.anything())
    expect(mocks.purgeBoardCache).toHaveBeenCalledWith(expect.anything(), "board-b")
  })

  it.each(["someone-elses-board", "missing"])("rejects preview and save for %s", async (boardId) => {
    await expect(previewProduct({ data: { url: "https://example.com/lamp", boardId } })).rejects.toThrow("You do not own this board")
    await expect(createProduct({ data: productForm(boardId) })).rejects.toThrow("You do not own this board")
    expect(mocks.previewProduct).not.toHaveBeenCalled()
    expect(mocks.importProduct).not.toHaveBeenCalled()
  })
})
