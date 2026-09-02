import { describe, expect, it } from "vitest"
import { upgradedImageUrl } from "./images"

describe("upgradedImageUrl", () => {
  it("asks CDNs for a large render", () => {
    expect(
      upgradedImageUrl("https://cdn.shopify.com/files/tee_493x616.jpg?v=1"),
    ).toBe("https://cdn.shopify.com/files/tee_2000x.jpg?v=1")
    expect(
      upgradedImageUrl("https://images.ctfassets.net/linea.png?w=800&h=600"),
    ).toBe("https://images.ctfassets.net/linea.png?w=2000")
  })

  it("leaves images without size hints alone", () => {
    expect(upgradedImageUrl("https://example.com/photo.jpg")).toBeNull()
    expect(upgradedImageUrl("https://example.com/logo_2x.png")).toBeNull()
  })
})
