import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  collectProductEvidence: vi.fn(),
  insertProduct: vi.fn(),
  productExists: vi.fn(),
  storeProductImage: vi.fn(),
}))

vi.mock("../db/products", () => ({
  insertProduct: mocks.insertProduct,
  productExists: mocks.productExists,
}))
vi.mock("../images", () => ({
  deleteProductImage: vi.fn(),
  storeProductImage: mocks.storeProductImage,
}))
vi.mock("./collect-product-evidence", () => ({
  collectProductEvidence: mocks.collectProductEvidence,
}))

import { importProduct } from "./import-product"

describe("importProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("saves URL-derived details without an image when the page cannot be read", async () => {
    const sourceUrl =
      "https://www.cos.com/en-de/women/womenswear/dresses/minidresses/product/boat-neck-lace-mini-dress-light-blue-1358057001"
    const savedProduct = {
      id: "product-id",
      sourceUrl,
      name: "Boat Neck Lace Mini Dress Light Blue",
      brand: "COS",
      category: "Clothing" as const,
      originalImageUrl: "",
      processedImageKey: "",
      backgroundRemoved: false,
      subjectScale: 0.8,
      subjectPosition: { x: 0.5, y: 0.5 },
    }

    mocks.collectProductEvidence.mockRejectedValue(new Error("HTTP 403"))
    mocks.productExists.mockResolvedValue(false)
    mocks.insertProduct.mockResolvedValue(savedProduct)
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(importProduct(sourceUrl, {} as Env)).resolves.toEqual(savedProduct)
    expect(mocks.storeProductImage).not.toHaveBeenCalled()
    expect(mocks.insertProduct).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({
        sourceUrl,
        canonicalUrl: sourceUrl,
        name: "Boat Neck Lace Mini Dress Light Blue",
        brand: "COS",
        category: "Clothing",
        originalImageUrl: "",
        processedImageKey: "",
        importEvidence: { method: "fallback" },
      }),
    )
  })
})
