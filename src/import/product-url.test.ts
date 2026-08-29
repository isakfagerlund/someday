import { describe, expect, it, vi } from "vitest"

import {
  fetchProductPage,
  ProductUrlError,
  validateProductUrl,
} from "./product-url"

describe("validateProductUrl", () => {
  it("normalizes a public product URL", () => {
    const url = validateProductUrl(
      " HTTPS://Shop.Example.COM:443/products/lamp?q=blue#details ",
    )

    expect(url.href).toBe("https://shop.example.com/products/lamp?q=blue")
  })

  it.each([
    "file:///etc/passwd",
    "https://user:password@shop.example.com/product",
    "http://localhost/product",
    "http://shop.localhost/product",
    "http://catalog.internal/product",
    "http://127.0.0.1/product",
    "http://2130706433/product",
    "http://0x7f000001/product",
    "http://0177.0.0.1/product",
    "http://[::1]/product",
    "https://shop.example.com:8443/product",
    "http://shop/product",
  ])("rejects unsafe destination %s", (input) => {
    expect(() => validateProductUrl(input)).toThrow(ProductUrlError)
  })
})

describe("fetchProductPage", () => {
  it("manually follows and revalidates redirects", async () => {
    const finalResponse = new Response("<html></html>")
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: { location: "/products/lamp" },
        }),
      )
      .mockResolvedValueOnce(finalResponse)

    const result = await fetchProductPage("https://shop.example.com/start", fetcher)

    expect(result.url.href).toBe("https://shop.example.com/products/lamp")
    expect(result.response).toBe(finalResponse)
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenCalledWith(
      "https://shop.example.com/start",
      expect.objectContaining({ redirect: "manual" }),
    )
  })

  it("rejects a redirect to a blocked destination", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/private" },
      }),
    )

    await expect(
      fetchProductPage("https://shop.example.com/product", fetcher),
    ).rejects.toThrow(ProductUrlError)
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it("limits redirect chains", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "/again" },
      }),
    )

    await expect(
      fetchProductPage("https://shop.example.com/product", fetcher),
    ).rejects.toThrow("Product page redirected too many times")
    expect(fetcher).toHaveBeenCalledTimes(6)
  })
})
