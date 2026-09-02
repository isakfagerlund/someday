import { describe, expect, it, vi } from "vitest"

import {
  collectProductEvidence,
  needsRenderedFallback,
  type ProductBrowser,
} from "./collect-product-evidence"
import type { ProductEvidence } from "./product-evidence"

function evidence(overrides: Partial<ProductEvidence> = {}): ProductEvidence {
  return {
    pageUrl: "https://shop.example.com/product",
    canonicalUrl: null,
    title: "Desk Lamp",
    metadata: {},
    jsonLd: [],
    text: "",
    images: [{ url: "https://shop.example.com/lamp.jpg", source: "html" }],
    ...overrides,
  }
}

describe("needsRenderedFallback", () => {
  it("requires both a plausible name and an image", () => {
    expect(needsRenderedFallback(evidence())).toBe(false)
    expect(needsRenderedFallback(evidence({ title: null }))).toBe(true)
    expect(needsRenderedFallback(evidence({ images: [] }))).toBe(true)
  })

  it("recognizes Product JSON-LD inside an @graph", () => {
    const product = evidence({
      title: null,
      jsonLd: [{ "@graph": [{ "@type": "Product", name: "Desk Lamp" }] }],
    })

    expect(needsRenderedFallback(product)).toBe(false)
  })
})

describe("collectProductEvidence", () => {
  it("keeps sufficient evidence from the direct fetch", async () => {
    const browser = { quickAction: vi.fn() } satisfies ProductBrowser
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        `<title>Desk Lamp</title><meta property="og:image" content="/lamp.jpg">`,
        { headers: { "content-type": "text/html" } },
      ),
    )

    const result = await collectProductEvidence(
      "https://shop.example.com/product",
      browser,
      fetcher,
    )

    expect(result.method).toBe("direct")
    expect(browser.quickAction).not.toHaveBeenCalled()
  })

  it("renders once when the direct fetch lacks an image", async () => {
    const browser = {
      quickAction: vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          result:
            `<title>Desk Lamp</title><meta property="og:image" content="/rendered-lamp.jpg">`,
          meta: {
            status: 200,
            title: "Desk Lamp",
            finalUrl: "https://shop.example.com/products/desk-lamp",
          },
        }),
      ),
    } satisfies ProductBrowser
    const fetcher = vi.fn().mockResolvedValue(
      new Response("<title>Shop</title>", {
        headers: { "content-type": "text/html" },
      }),
    )

    const result = await collectProductEvidence(
      "https://shop.example.com/product",
      browser,
      fetcher,
    )

    expect(result.method).toBe("rendered")
    expect(result.evidence.pageUrl).toBe(
      "https://shop.example.com/products/desk-lamp",
    )
    expect(result.evidence.images[0]?.url).toBe(
      "https://shop.example.com/rendered-lamp.jpg",
    )
    expect(browser.quickAction).toHaveBeenCalledOnce()
    expect(browser.quickAction).toHaveBeenCalledWith(
      "content",
      expect.objectContaining({
        url: "https://shop.example.com/product",
        rejectResourceTypes: ["image", "media", "font", "stylesheet"],
      }),
    )
  })

  it("retries a 403 with the cookies handed out by the site root", async () => {
    const browser = { quickAction: vi.fn() } satisfies ProductBrowser
    const fetcher = vi.fn(async (url: string, init: RequestInit) => {
      if (url === "https://shop.example.com/") {
        return new Response("<title>Shop</title>", {
          headers: {
            "content-type": "text/html",
            "set-cookie": "PHPSESSID=abc123; Path=/; HttpOnly",
          },
        })
      }

      if (new Headers(init.headers).get("cookie") !== "PHPSESSID=abc123") {
        return new Response("Blocked", { status: 403 })
      }

      return new Response(
        `<title>Desk Lamp</title><meta property="og:image" content="/lamp.jpg">`,
        { headers: { "content-type": "text/html" } },
      )
    })

    const result = await collectProductEvidence(
      "https://shop.example.com/product/desk-lamp/",
      browser,
      fetcher,
    )

    expect(result.method).toBe("direct")
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(browser.quickAction).not.toHaveBeenCalled()
  })

  it("falls back to platform JSON instead of rendering a thin Shopify page", async () => {
    const browser = { quickAction: vi.fn() } satisfies ProductBrowser
    const fetcher = vi.fn(async (url: string) =>
      url.endsWith(".json")
        ? Response.json({
            product: {
              title: "Desk Lamp",
              vendor: "Lumen",
              product_type: "Lighting",
              images: [{ src: "https://cdn.shopify.com/lamp.jpg", width: 1200 }],
            },
          })
        : new Response("<div id=app></div>", {
            headers: { "content-type": "text/html" },
          }),
    )

    const result = await collectProductEvidence(
      "https://shop.example.com/collections/lamps/products/desk-lamp",
      browser,
      fetcher,
    )

    expect(result.method).toBe("platform")
    expect(result.evidence.metadata).toEqual({
      "og:title": "Desk Lamp",
      "product:brand": "Lumen",
    })
    expect(result.evidence.images).toEqual([
      { url: "https://cdn.shopify.com/lamp.jpg", source: "platform", width: 1200 },
    ])
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://shop.example.com/collections/lamps/products/desk-lamp.json",
      expect.anything(),
    )
    expect(browser.quickAction).not.toHaveBeenCalled()
  })

  it("does not render blocked pages, since bot managers block Browser Run too", async () => {
    const browser = { quickAction: vi.fn() } satisfies ProductBrowser
    const fetcher = vi.fn(async () => new Response("Access Denied", { status: 403 }))

    await expect(
      collectProductEvidence(
        "https://www.cos.com/en-de/product/boat-neck-lace-mini-dress-1358057001",
        browser,
        fetcher,
      ),
    ).rejects.toThrow("Product page returned HTTP 403")

    expect(browser.quickAction).not.toHaveBeenCalled()
  })
})
