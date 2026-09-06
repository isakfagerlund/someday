import { describe, expect, it } from "vitest"
import { hasTransparentBackground } from "./image-transparency"

function pixels(alpha: (x: number, y: number) => number) {
  const rgba = new Uint8Array(64 * 64 * 4)
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) rgba[(y * 64 + x) * 4 + 3] = alpha(x, y)
  }
  return rgba
}

describe("hasTransparentBackground", () => {
  it("preserves a cutout with soft edges and a clear background", () => {
    const cutout = pixels((x, y) =>
      x > 8 && x < 55 && y > 8 && y < 55 ? 180 : 0,
    )
    expect(hasTransparentBackground(cutout, 64, 64)).toBe(true)
  })

  it("does not mistake an opaque alpha channel or translucent photo for a cutout", () => {
    for (const alpha of [255, 128]) {
      expect(
        hasTransparentBackground(
          pixels(() => alpha),
          64,
          64,
        ),
      ).toBe(false)
    }
  })

  it("does not skip removal for a few clear corners or an interior hole", () => {
    const corners = pixels((x, y) =>
      (x < 3 || x > 60) && (y < 3 || y > 60) ? 0 : 255,
    )
    const hole = pixels((x, y) =>
      x > 8 && x < 55 && y > 8 && y < 55 ? 0 : 255,
    )
    expect(hasTransparentBackground(corners, 64, 64)).toBe(false)
    expect(hasTransparentBackground(hole, 64, 64)).toBe(false)
  })
})
