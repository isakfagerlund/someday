import { describe, expect, it } from "vitest"

import { productFallbackFromUrl } from "./product-fallback"

describe("productFallbackFromUrl", () => {
  it("derives useful product details from a retailer URL", () => {
    expect(
      productFallbackFromUrl(
        "https://www.cos.com/en-de/women/womenswear/dresses/minidresses/product/boat-neck-lace-mini-dress-light-blue-1358057001",
      ),
    ).toEqual({
      canonicalUrl:
        "https://www.cos.com/en-de/women/womenswear/dresses/minidresses/product/boat-neck-lace-mini-dress-light-blue-1358057001",
      name: "Boat Neck Lace Mini Dress Light Blue",
      brand: "COS",
      category: "Clothing",
    })
  })
})
