import { describe, expect, it, vi } from "vitest"

import { variantFromUrl } from "./product-variant"

describe("variantFromUrl", () => {
  it("resolves a pinned Shopify variant to the shop's own color and size", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        product: {
          title: "Wool Runner",
          options: [
            { name: "Color", values: ["Natural Black", "Anthracite"] },
            { name: "Size", values: ["8", "8.5"] },
          ],
          variants: [
            { id: 111, title: "Anthracite / 8", option1: "Anthracite", option2: "8" },
            { id: 222, title: "Anthracite / 8.5", option1: "Anthracite", option2: "8.5" },
          ],
          images: [{ src: "https://shoes.example/runner.jpg" }],
        },
      }),
    )

    await expect(
      variantFromUrl(
        new URL("https://shoes.example/products/wool-runner?variant=222"),
        fetcher,
      ),
    ).resolves.toEqual({ color: "Anthracite", size: "8.5" })
    expect(fetcher).toHaveBeenCalledWith(
      "https://shoes.example/products/wool-runner.json",
      expect.anything(),
    )
  })

  it("leaves the size unknown when the shop hides its variants", async () => {
    const fetcher = vi.fn(async () => new Response("nope", { status: 403 }))

    await expect(
      variantFromUrl(
        new URL("https://shoes.example/products/wool-runner?variant=222"),
        fetcher,
      ),
    ).resolves.toEqual({ color: null, size: null })
  })

  it.each([
    ["https://shop.example/dress?size=M", "M"],
    ["https://shop.example/dress?dwvar_1358057_size=42", "42"],
    ["https://shop.example/dress?storlek=W32%20L34", "W32 L34"],
    // An article id in a size parameter is not a size anyone can buy.
    ["https://shop.example/dress?size=1358057001", null],
    ["https://shop.example/dress?color=black", null],
  ])("reads the size pinned in %s", async (url, size) => {
    const fetcher = vi.fn()

    await expect(variantFromUrl(new URL(url), fetcher)).resolves.toEqual({
      color: null,
      size,
    })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
