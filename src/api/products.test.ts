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
      error: 'Send JSON like {"url":"https://shop.example/product"}',
    })
  })

  it("rejects an unsafe product URL before using any bindings", async () => {
    const request = new Request("https://someday.example/api/products", {
      method: "POST",
      body: JSON.stringify({ url: "http://localhost/product" }),
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
      error: "Product URLs must use a public domain",
    })
  })

  it("redirects an invalid HTML form back to the catalog", async () => {
    const request = new Request("https://someday.example/api/products", {
      method: "POST",
      body: new URLSearchParams({ url: "" }),
    })

    const response = await handleCreateProduct(
      request,
      "user_owner",
      {} as Env,
      {} as ExecutionContext,
    )

    expect(response.status).toBe(303)
    expect(response.headers.get("location")).toBe(
      "https://someday.example/isaks-board?import=invalid",
    )
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
