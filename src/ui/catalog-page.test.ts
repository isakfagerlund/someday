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

describe("renderCatalogPage", () => {
  it("renders responsive images and prioritizes only the first one", () => {
    const html = renderCatalogPage({ activeCategory: null, products })

    expect(html).toContain("/images/first-image/360.webp 360w")
    expect(html).toContain("/images/first-image/1080.webp 1080w")
    expect(html).toContain('loading="eager" fetchpriority="high"')
    expect(html.match(/loading="lazy"/g)).toHaveLength(1)
    expect(html).toContain('action="/api/products"')
    expect(html).toContain('src="/catalog.js"')
  })
})
