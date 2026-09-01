import { describe, expect, it } from "vitest"

import type { CatalogProduct } from "../domain/product"
import { renderCatalogPage } from "./catalog-page"

const products: CatalogProduct[] = [
  {
    id: "first",
    sourceUrl: "https://shop.example.com/first",
    name: "First product",
    brand: "Example",
    category: "Other",
    originalImageUrl: "https://shop.example.com/first.jpg",
    processedImageKey: "first-image",
    backgroundRemoved: true,
    subjectScale: 0.8,
    subjectPosition: { x: 0.5, y: 0.5 },
  },
  {
    id: "second",
    sourceUrl: "https://shop.example.com/second",
    name: "Second product",
    brand: "Example",
    category: "Other",
    originalImageUrl: "https://shop.example.com/second.jpg",
    processedImageKey: "second-image",
    backgroundRemoved: false,
    subjectScale: 0.8,
    subjectPosition: { x: 0.5, y: 0.5 },
  },
]

const board = {
  id: "default",
  name: "someday",
  slug: "isaks-board",
  clerkOwnerId: "user_owner",
}

describe("renderCatalogPage", () => {
  it("renders responsive images and prioritizes only the first one", () => {
    const html = renderCatalogPage({
      activeCategory: null,
      board,
      canManage: true,
      clerkPublishableKey: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      products,
    })

    expect(html).toContain("/images/first-image/360.webp 360w")
    expect(html).toContain("/images/first-image/1080.webp 1080w")
    expect(html).toContain('loading="eager" fetchpriority="high"')
    expect(html.match(/loading="lazy"/g)).toHaveLength(1)
    expect(html).toContain("data-image-choices")
    expect(html).toContain("data-image-next")
    expect(html).not.toContain("data-back-to-url")
    expect(html).not.toContain('name="customImageUrl"')
    expect(html).toContain("data-import-error")
    expect(html).toContain('src="/catalog.js"')
  })

  it("renders a product without requesting a missing image", () => {
    const html = renderCatalogPage({
      activeCategory: null,
      board,
      canManage: false,
      clerkPublishableKey: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      products: [
        {
          ...products[0],
          originalImageUrl: "",
          processedImageKey: "",
        },
      ],
    })

    expect(html).not.toContain("<img")
    expect(html).not.toContain("/images/")
    expect(html).toContain("First product")
  })

  it("omits all management markup and scripts from the public page", () => {
    const html = renderCatalogPage({
      activeCategory: null,
      board,
      canManage: false,
      clerkPublishableKey: "pk_test_ZXhhbXBsZS5jbGVyay5hY2NvdW50cy5kZXYk",
      products,
    })

    expect(html).not.toContain("data-open-import-dialog")
    expect(html).not.toContain("data-edit-product")
    expect(html).not.toContain("/catalog.js")
    expect(html).not.toContain("<dialog")
    expect(html).toContain('href="/isaks-board?category=Clothing"')
  })
})
