import { env } from "cloudflare:workers"
import { describe, expect, it } from "vitest"
import { restoreOriginalProductImage, storeProductImage, upgradedImageUrl } from "./images"

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

  it("resizes Herman Miller originals before downloading them", () => {
    const imageUrl = "https://images.hermanmiller.group/asset/e6433c76-c07c-4065-a407-6ec11f04aba5/W/HM_AER_2195348_100249204_black_polished_a.png"
    expect(upgradedImageUrl(imageUrl)).toBe(`${imageUrl}?w=2000`)
  })
})

// Exercise the real pipeline without invoking the remote segmentation model.
// A transparent source must reach storage without ever requesting segmentation.

it.each([
  { transparent: true, restore: false },
  { transparent: false, restore: false },
  { transparent: false, restore: true },
])(
  "chooses the right image pipeline for %j",
  async ({ transparent, restore }) => {
    const transforms: ImageTransform[] = []
    const sample = new Uint8Array(64 * 64 * 4)
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        sample[(y * 64 + x) * 4 + 3] =
          transparent && (x < 8 || x > 55 || y < 8 || y > 55) ? 0 : 255
      }
    }
    const transformer: ImageTransformer = {
      transform(options) {
        transforms.push(options)
        return this
      },
      draw() {
        return this
      },
      async output(options) {
        const blob =
          options.format === "rgba" ? new Blob([sample]) : new Blob(["image"])
        return {
          image: () => blob.stream(),
          contentType: () => "image/webp",
          response: () => new Response(blob),
        }
      },
    }
    const images: ImagesBinding = {
      input: () => transformer,
      info: async () => ({
        format: "image/png",
        fileSize: 0,
        width: 1080,
        height: 1350,
      }),
      text: () => transformer,
      hosted: env.IMAGES.hosted,
    }
    const originalKey = `products/${crypto.randomUUID()}/original`
    if (restore) await env.IMAGE_BUCKET.put(originalKey, "source")
    const result = restore ? await restoreOriginalProductImage(
      originalKey.split("/")[1]!, env.IMAGE_BUCKET, images,
    ) : await storeProductImage(
      new Blob(["source"]),
      env.IMAGE_BUCKET,
      images,
    )

    expect(
      transforms.some((transform) => transform.segment === "foreground"),
    ).toBe(!transparent && !restore)
    expect(result.backgroundRemoved).toBe(!transparent && !restore)
    if (restore) {
      expect(result.subjectScale).toBe(1)
      expect(transforms).toHaveLength(3)
      expect(transforms.every(({ fit, background }) => fit === "pad" && background === "rgba(0,0,0,0)")).toBe(true)
      expect(`products/${result.processedImageKey}/original`).not.toBe(originalKey)
      expect(await (await env.IMAGE_BUCKET.get(`products/${result.processedImageKey}/original`))?.text()).toBe("source")
      expect(await env.IMAGE_BUCKET.head(originalKey)).not.toBeNull()
    }
    for (const width of [360, 720, 1080]) {
      expect(
        await env.IMAGE_BUCKET.head(
          `products/${result.processedImageKey}/${width}.webp`,
        ),
      ).not.toBeNull()
    }
  },
)

it("does not replace an image when its saved original is missing", async () => {
  await expect(restoreOriginalProductImage("missing", env.IMAGE_BUCKET, env.IMAGES))
    .rejects.toThrow("The original image is no longer available.")
})
