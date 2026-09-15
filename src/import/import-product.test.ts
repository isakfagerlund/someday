import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  collectProductEvidence: vi.fn(),
  insertProduct: vi.fn(),
  getProductByUrl: vi.fn(),
  searchProduct: vi.fn(),
  storeProductImage: vi.fn(),
}))

vi.mock("../db/products", () => ({
  insertProduct: mocks.insertProduct,
  getProductByUrl: mocks.getProductByUrl,
}))
vi.mock("../images", () => ({
  deleteProductImage: vi.fn(),
  storeProductImage: mocks.storeProductImage,
}))
vi.mock("./collect-product-evidence", () => ({
  collectProductEvidence: mocks.collectProductEvidence,
}))
vi.mock("./search-product", () => ({ searchProduct: mocks.searchProduct }))

import {
  createProduct,
  previewProduct,
  productImageChoices,
} from "./import-product"

const sourceUrl =
  "https://www.cos.com/en-de/women/womenswear/dresses/minidresses/product/boat-neck-lace-mini-dress-light-blue-1358057001"

describe("previewProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    vi.spyOn(console, "warn").mockImplementation(() => undefined)
  })

  it("uses web search when the retailer blocks both page readers", async () => {
    mocks.collectProductEvidence.mockRejectedValue(new Error("HTTP 403"))
    mocks.searchProduct.mockResolvedValue({
      name: "Boat-neck lace mini dress",
      brand: "COS",
      category: "Clothing",
      imageUrls: ["https://media.cos.com/dress-front.jpg"],
    })

    await expect(
      previewProduct(sourceUrl, { OPENAI_API_KEY: "test" } as Env),
    ).resolves.toMatchObject({
      name: "Boat-neck lace mini dress",
      method: "search",
      recommendedImageUrl: "https://media.cos.com/dress-front.jpg",
    })
  })

  it("returns a fallback without publishing a text-only product", async () => {
    mocks.collectProductEvidence.mockRejectedValue(new Error("HTTP 403"))
    mocks.searchProduct.mockRejectedValue(new Error("No result"))

    await expect(
      previewProduct(sourceUrl, { OPENAI_API_KEY: "test" } as Env),
    ).resolves.toMatchObject({
      name: "Boat Neck Lace Mini Dress Light Blue",
      brand: "COS",
      imageUrls: [],
      method: "fallback",
    })
  })
})

describe("productImageChoices", () => {
  it("keeps the recommendation first and collapses resized duplicates", () => {
    const evidence = {
      pageUrl: sourceUrl,
      canonicalUrl: sourceUrl,
      title: "Dress",
      metadata: {},
      jsonLd: [],
      text: "",
      images: [
        {
          url: "https://media.cos.com/dress.jpg?w=400&fm=webp&fit=fill&f=center",
          source: "html" as const,
        },
        {
          url: "https://media.cos.com/dress.jpg?w=1200&fm=avif&fit=fill&f=center",
          source: "json-ld" as const,
        },
        {
          url: "https://media.cos.com/detail.jpg",
          source: "html" as const,
        },
      ],
    }

    expect(
      productImageChoices(
        evidence,
        "https://media.cos.com/detail.jpg",
      ),
    ).toEqual([
      "https://media.cos.com/detail.jpg",
      "https://media.cos.com/dress.jpg?w=1200&fm=avif&fit=fill&f=center",
    ])
  })
})

describe("createProduct", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(["owned", "archived"])("returns the existing %s product without importing its image again", async (status) => {
    const product = { id: "existing-product", status }
    mocks.getProductByUrl.mockResolvedValue(product)
    await expect(createProduct({
      sourceUrl, canonicalUrl: sourceUrl, name: "Dress", brand: "COS", category: "Clothing",
      imageUrl: "https://media.cos.com/dress-front.jpg", method: "search",
    }, "default", {} as Env)).rejects.toMatchObject({ name: "DuplicateProductError", product })
    expect(mocks.storeProductImage).not.toHaveBeenCalled()
    expect(mocks.insertProduct).not.toHaveBeenCalled()
  })

  it("stores the image selected by the user before inserting the product", async () => {
    const savedProduct = { id: "product-id" }
    mocks.getProductByUrl.mockResolvedValue(undefined)
    mocks.storeProductImage.mockResolvedValue({
      processedImageKey: "image-key",
      backgroundRemoved: true,
      subjectScale: 0.8,
      subjectPosition: { x: 0.5, y: 0.5 },
    })
    mocks.insertProduct.mockResolvedValue(savedProduct)

    await expect(
      createProduct(
        {
          sourceUrl,
          canonicalUrl: sourceUrl,
          name: "Boat-neck lace mini dress",
          brand: "COS",
          category: "Clothing",
          imageUrl: "https://media.cos.com/dress-front.jpg",
          method: "search",
        },
        "default",
        {} as Env,
      ),
    ).resolves.toBe(savedProduct)

    expect(mocks.storeProductImage).toHaveBeenCalledWith(
      "https://media.cos.com/dress-front.jpg",
      undefined,
      undefined,
    )
    expect(mocks.insertProduct).toHaveBeenCalledWith(
      undefined,
      "default",
      expect.objectContaining({
        originalImageUrl: "https://media.cos.com/dress-front.jpg",
        processedImageKey: "image-key",
        importEvidence: { method: "search", selectedByUser: true },
      }),
    )
  })
})
