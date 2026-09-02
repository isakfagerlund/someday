import { describe, expect, it, vi } from "vitest"

import { fetchPlatformEvidence } from "./platform-product"

describe("fetchPlatformEvidence", () => {
  it("reads WooCommerce products from the locale-prefixed Store API", async () => {
    const fetcher = vi.fn(async () =>
      Response.json([
        {
          name: "Linea Micra",
          permalink: "https://lamarzocco.example/en/product/linea-micra/",
          brands: [{ name: "La Marzocco" }],
          categories: [{ name: "Home Machines" }],
          images: [{ src: "https://lamarzocco.example/micra.jpg", alt: "Micra" }],
        },
      ]),
    )

    const evidence = await fetchPlatformEvidence(
      new URL("https://lamarzocco.example/en/product/linea-micra/"),
      fetcher,
    )

    expect(fetcher).toHaveBeenCalledWith(
      "https://lamarzocco.example/en/wp-json/wc/store/v1/products?slug=linea-micra",
      expect.anything(),
    )
    expect(evidence).toMatchObject({
      canonicalUrl: "https://lamarzocco.example/en/product/linea-micra/",
      title: "Linea Micra",
      metadata: { "product:brand": "La Marzocco" },
      text: "Home Machines",
      images: [{ url: "https://lamarzocco.example/micra.jpg", alt: "Micra" }],
    })
  })

  it("skips URLs without a recognizable platform path", async () => {
    const fetcher = vi.fn()

    await expect(
      fetchPlatformEvidence(new URL("https://shop.example.com/p/123"), fetcher),
    ).resolves.toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
})
