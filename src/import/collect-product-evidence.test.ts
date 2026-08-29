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

  it("renders when the direct fetch is blocked", async () => {
    const browser = {
      quickAction: vi.fn().mockResolvedValue(
        Response.json({
          success: true,
          result:
            `<title>Desk Lamp</title><meta property="og:image" content="/rendered-lamp.jpg">`,
          meta: {
            status: 200,
            title: "Desk Lamp",
            finalUrl: "https://shop.example.com/product",
          },
        }),
      ),
    } satisfies ProductBrowser
    const fetcher = vi.fn().mockResolvedValue(
      new Response("Blocked", { status: 403 }),
    )

    const result = await collectProductEvidence(
      "https://shop.example.com/product",
      browser,
      fetcher,
    )

    expect(result.method).toBe("rendered")
    expect(browser.quickAction).toHaveBeenCalledOnce()
  })
})
