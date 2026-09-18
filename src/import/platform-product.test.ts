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

  it("reads the pinned Shopify variant as the color and size evidence", async () => {
    const product = {
      title: "Boat-neck lace mini dress",
      vendor: "COS",
      product_type: "Dresses",
      options: [
        { name: "Color", values: ["Light Blue", "Black"] },
        { name: "Size", values: ["S", "M", "L"] },
      ],
      variants: [
        { id: 1, title: "Light Blue / S" },
        { id: 2, title: "Light Blue / M" },
      ],
      images: [{ src: "https://cos.example/dress.jpg" }],
    }
    const fetcher = vi.fn(async () => Response.json({ product }))

    await expect(
      fetchPlatformEvidence(
        new URL("https://cos.example/products/lace-mini-dress?variant=2"),
        fetcher,
      ),
    ).resolves.toMatchObject({
      text: "Dresses. Selected variant: Light Blue / M",
    })

    // Without a pinned variant the shop's own options are the best evidence.
    await expect(
      fetchPlatformEvidence(
        new URL("https://cos.example/products/lace-mini-dress"),
        fetcher,
      ),
    ).resolves.toMatchObject({
      text: "Dresses. Color: Light Blue, Black. Size: S, M, L",
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
