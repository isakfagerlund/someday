import { describe, expect, it } from "vitest"

import {
  extractProductEvidence,
  ProductEvidenceError,
} from "./product-evidence"

const pageUrl = new URL("https://shop.example.com/products/lamp")

describe("extractProductEvidence", () => {
  it("collects compact product evidence from HTML", async () => {
    const response = new Response(
      `<!doctype html>
      <html>
        <head>
          <base href="https://cdn.example.com/catalog/">
          <title>  Pleated Lamp  </title>
          <link rel="canonical" href="../products/pleated-lamp#details">
          <meta property="og:title" content="Pleated Lamp">
          <meta property="product:brand" content="Hay">
          <meta property="og:image" content="images/lamp.jpg">
          <meta name="twitter:image" content="https://images.example.com/lamp.jpg">
          <script type="application/ld+json">
            {"@type":"Product","name":"Pleated Lamp","brand":"Hay","image":["structured-front.jpg",{"contentUrl":"/structured-back.jpg"}]}
          </script>
          <script type="application/ld+json">not valid json</script>
        </head>
        <body>
          <h1>Pleated Lamp</h1>
          <p>A soft paper shade.</p>
          <picture>
            <source srcset="/lamp-source-small.jpg 600w, /lamp-source-large.jpg 1400w">
            <img src="/lamp-small.jpg" width="400" srcset="/lamp-medium.jpg 800w, /lamp-large.jpg 1200w">
          </picture>
          <img src="data:image/png;base64,nope">
        </body>
      </html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    )

    const evidence = await extractProductEvidence(response, pageUrl)

    expect(evidence).toEqual({
      pageUrl: pageUrl.href,
      canonicalUrl: "https://cdn.example.com/products/pleated-lamp",
      title: "Pleated Lamp",
      metadata: {
        "og:title": "Pleated Lamp",
        "product:brand": "Hay",
        "og:image": "images/lamp.jpg",
        "twitter:image": "https://images.example.com/lamp.jpg",
      },
      jsonLd: [
        {
          "@type": "Product",
          name: "Pleated Lamp",
          brand: "Hay",
          image: [
            "structured-front.jpg",
            { contentUrl: "/structured-back.jpg" },
          ],
        },
      ],
      text: "Pleated Lamp A soft paper shade.",
      images: [
        {
          url: "https://cdn.example.com/catalog/images/lamp.jpg",
          source: "open-graph",
        },
        { url: "https://images.example.com/lamp.jpg", source: "twitter" },
        {
          url: "https://cdn.example.com/catalog/structured-front.jpg",
          source: "json-ld",
        },
        {
          url: "https://cdn.example.com/structured-back.jpg",
          source: "json-ld",
        },
        {
          url: "https://cdn.example.com/lamp-source-large.jpg",
          source: "html",
          width: 1400,
        },
        {
          url: "https://cdn.example.com/lamp-small.jpg",
          source: "html",
          width: 400,
        },
        {
          url: "https://cdn.example.com/lamp-large.jpg",
          source: "html",
          width: 1200,
        },
      ],
    })
  })

  it("rejects non-HTML responses", async () => {
    const response = Response.json({ name: "Pleated Lamp" })

    await expect(extractProductEvidence(response, pageUrl)).rejects.toThrow(
      ProductEvidenceError,
    )
  })

  it("decodes image URL query parameters from HTML attributes", async () => {
    const response = new Response(
      `<img src="/lamp.jpg?width=1200&amp;height=900">`,
      { headers: { "content-type": "text/html" } },
    )

    const evidence = await extractProductEvidence(response, pageUrl)

    expect(evidence.images[0]?.url).toBe(
      "https://shop.example.com/lamp.jpg?width=1200&height=900",
    )
  })

  it("rejects a declared body over the size limit", async () => {
    const response = new Response("<html></html>", {
      headers: {
        "content-length": "4000001",
        "content-type": "text/html",
      },
    })

    await expect(extractProductEvidence(response, pageUrl)).rejects.toThrow(
      "Product page HTML is too large",
    )
  })
})
