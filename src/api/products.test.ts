import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getBoardByOwnerId: vi.fn(),
  getProductBoard: vi.fn(),
}))

vi.mock("../db/boards", () => ({
  getBoardByOwnerId: mocks.getBoardByOwnerId,
  getProductBoard: mocks.getProductBoard,
}))

import {
  handleCreateProduct,
  handleDeleteProduct,
  handlePreviewProduct,
  handleUpdateProduct,
} from "./products"

describe("handleCreateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getBoardByOwnerId.mockResolvedValue({
      id: "default",
      name: "someday",
      slug: "isaks-board",
      clerkOwnerId: "user_owner",
    })
  })

  it("rejects malformed input before using any bindings", async () => {
    const request = new Request("https://someday.example/api/products", {
      method: "POST",
      body: JSON.stringify({ product: "missing-url" }),
      headers: { "content-type": "application/json" },
    })

    const response = await handleCreateProduct(
      request,
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Confirm the product details and choose an image.",
    })
  })

  it("reads an uploaded image from a multipart request", async () => {
    // Board lookup is the first step after parsing, so a 403 proves the
    // multipart body was understood without touching D1 or R2.
    mocks.getBoardByOwnerId.mockResolvedValue(undefined)

    const body = new FormData()
    body.append("sourceUrl", "https://shop.example/product")
    body.append("canonicalUrl", "https://shop.example/product")
    body.append("name", "Boat-neck lace mini dress")
    body.append("brand", "COS")
    body.append("category", "Clothing")
    body.append("imageUrl", "")
    body.append("method", "fallback")
    body.append("imageFile", new File(["image-bytes"], "dress.png", {
      type: "image/png",
    }))

    const response = await handleCreateProduct(
      new Request("https://someday.example/api/products", {
        method: "POST",
        body,
      }),
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(403)
  })

  it("rejects an unsafe product URL before using any bindings", async () => {
    const request = new Request("https://someday.example/api/product-previews", {
      method: "POST",
      body: JSON.stringify({ url: "http://localhost/product" }),
      headers: { "content-type": "application/json" },
    })

    const response = await handlePreviewProduct(
      request,
      "user_owner",
      {} as Env,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "Product URLs must use a public domain",
    })
  })

  it("rejects a malformed delete ID before using any bindings", async () => {
    const response = await handleDeleteProduct(
      "not-a-product-id",
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(404)
  })

  it("rejects an empty product update before using D1", async () => {
    const request = new Request(
      "https://someday.example/api/products/00000000-0000-4000-8000-000000000000",
      {
        method: "PATCH",
        body: JSON.stringify({}),
        headers: { "content-type": "application/json" },
      },
    )

    const response = await handleUpdateProduct(
      request,
      "00000000-0000-4000-8000-000000000000",
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(400)
  })

  it("rejects an update from a user who does not own the product board", async () => {
    mocks.getProductBoard.mockResolvedValue({
      boardId: "other-board",
      boardSlug: "other-board",
      clerkOwnerId: "user_other",
    })
    const productId = "00000000-0000-4000-8000-000000000000"
    const request = new Request(
      `https://someday.example/api/products/${productId}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Changed" }),
        headers: { "content-type": "application/json" },
      },
    )

    const response = await handleUpdateProduct(
      request,
      productId,
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: "You do not own this board",
    })
  })
})
