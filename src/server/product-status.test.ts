import { env } from "cloudflare:workers"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  viewerId: vi.fn(),
  purge: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock("./viewer", () => ({ getViewerId: mocks.viewerId }))
// Call the real handlers with request context, without an HTTP transport or Clerk session.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator() { return this },
    handler(handler: (input: unknown) => unknown) {
      return (input: { data: unknown }) => handler({
        ...input,
        context: { ctx: { cache: { purge: mocks.purge } } },
      })
    },
  }),
}))

import { getProductByUrl, insertProduct, listProducts, setProductStatus as setStatusInDb } from "../db/products"
import { loadBoard } from "./pages"
import { setProductStatus } from "./products"

const productId = "c49db3b2-4a04-4d2e-9e2f-a171a43232e1"
const sourceUrl = "https://example.com/legacy-product"
let migratedProduct: Record<string, unknown> | null

beforeAll(async () => {
  const migrations = import.meta.glob<string>("../../drizzle/*/migration.sql", { query: "?raw", import: "default", eager: true })
  for (const [path, migration] of Object.entries(migrations).sort(([a], [b]) => a.localeCompare(b))) {
    if (path.includes("product_status")) {
      await env.DB.prepare("INSERT INTO products (id, board_id, source_url, canonical_url, name, brand, category, image_key, import_evidence) VALUES (?, 'default', ?, ?, 'Legacy product', 'Brand', 'Tech', 'legacy-image', '{}')").bind(productId, sourceUrl, sourceUrl).run()
    }
    for (const statement of migration.split("--> statement-breakpoint")) {
      if (statement.trim()) await env.DB.prepare(statement).run()
    }
  }
  migratedProduct = await env.DB.prepare("SELECT status, owned_at, image_key FROM products WHERE id = ?").bind(productId).first()
  await env.DB.prepare("UPDATE boards SET clerk_owner_id = 'owner' WHERE id = 'default'").run()
})

beforeEach(async () => {
  mocks.viewerId.mockResolvedValue("owner")
  mocks.purge.mockClear()
  await env.DB.prepare("DELETE FROM products WHERE id != ?").bind(productId).run()
  await env.DB.prepare("UPDATE products SET status = 'wishlist', owned_at = NULL WHERE id = ?").bind(productId).run()
})

describe("product status", () => {
  it("migrates existing products to Wishlist and preserves their image", async () => {
    expect(migratedProduct).toEqual({ status: "wishlist", owned_at: null, image_key: "legacy-image" })
    const product = await insertProduct(env.DB, "default", {
      id: crypto.randomUUID(), sourceUrl: "https://example.com/new", canonicalUrl: "https://example.com/new",
      name: "New", brand: "Brand", category: "Tech", originalImageUrl: "", processedImageKey: "new-image",
      backgroundRemoved: false, subjectScale: 0.8, subjectPosition: { x: 0.5, y: 0.5 }, importEvidence: {},
    })
    expect(product).toMatchObject({ status: "wishlist", ownedAt: null })
  })

  it("persists reversible status changes, preserves images, and only dates entry to Owned", async () => {
    const owned = await setProductStatus({ data: { id: productId, status: "owned" } })
    expect(owned.ownedAt).toBeInstanceOf(Date)
    const repeated = await setProductStatus({ data: { id: productId, status: "owned" } })
    expect(repeated.ownedAt).toEqual(owned.ownedAt)
    expect(await setProductStatus({ data: { id: productId, status: "archived" } })).toMatchObject({ status: "archived", ownedAt: null, processedImageKey: "legacy-image" })
    expect(await setProductStatus({ data: { id: productId, status: "wishlist" } })).toMatchObject({ status: "wishlist", ownedAt: null })
    expect(mocks.purge).toHaveBeenCalledTimes(4)
    expect(mocks.purge).toHaveBeenLastCalledWith({ tags: ["board-default"] })
  })

  it.each([null, "another-owner"])("rejects status changes by viewer %s", async (viewer) => {
    mocks.viewerId.mockResolvedValue(viewer)
    await expect(setProductStatus({ data: { id: productId, status: "owned" } })).rejects.toThrow("You do not own this board")
    expect((await getProductByUrl(env.DB, "default", sourceUrl))?.status).toBe("wishlist")
    expect(mocks.purge).not.toHaveBeenCalled()
  })

  it.each(["owned", "archived"] as const)("keeps %s out of anonymous and other-owner loader responses", async (status) => {
    await setProductStatus({ data: { id: productId, status } })
    for (const viewer of [null, "another-owner"]) {
      mocks.viewerId.mockResolvedValue(viewer)
      const board = await loadBoard({ data: { slug: "isaks-board" } })
      expect(board.products).toEqual([])
      expect(board.canManage).toBe(false)
    }
    mocks.viewerId.mockResolvedValue("owner")
    expect((await loadBoard({ data: { slug: "isaks-board" } })).products).toEqual([expect.objectContaining({ id: productId, status })])
    await setProductStatus({ data: { id: productId, status: "wishlist" } })
    expect(await listProducts(env.DB, "default")).toEqual([expect.objectContaining({ id: productId })])
  })

  it("keeps duplicate lookup across statuses and scopes updates to the board", async () => {
    await setProductStatus({ data: { id: productId, status: "archived" } })
    expect(await getProductByUrl(env.DB, "default", sourceUrl)).toMatchObject({ id: productId, status: "archived" })
    expect(await getProductByUrl(env.DB, "other-board", sourceUrl)).toBeUndefined()
    expect(await setStatusInDb(env.DB, productId, "other-board", "wishlist")).toBeUndefined()
    await expect(env.DB.prepare("UPDATE products SET status = 'invalid' WHERE id = ?").bind(productId).run()).rejects.toThrow()
  })
})
