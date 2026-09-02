import { fetchPublicResource, type ProductFetcher } from "./import/product-url"

const maxSourceBytes = 20_000_000
const productImageDirectory = "products"
const subjectScale = 0.8
const subjectPosition = { x: 0.5, y: 0.5 } as const
const variantQuality = 92
const preferredSourceWidth = 2000
/** Composite above the largest variant so downscaling smooths the cutout edge. */
const maxMasterScale = 1.5
const transparentPixel =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII="

export const productImageVariants = [
  { width: 360, height: 450 },
  { width: 720, height: 900 },
  { width: 1080, height: 1350 },
] as const

type ProductImageWidth = (typeof productImageVariants)[number]["width"]
type ProductImageVariant = (typeof productImageVariants)[number]

export interface StoredProductImage {
  processedImageKey: string
  backgroundRemoved: boolean
  subjectScale: number
  subjectPosition: { x: number; y: number }
}

export class ProductImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductImageError"
  }
}

function originalKey(imageKey: string) {
  return `${productImageDirectory}/${imageKey}/original`
}

function variantKey(imageKey: string, width: ProductImageWidth) {
  return `${productImageDirectory}/${imageKey}/${width}.webp`
}

function allImageKeys(imageKey: string) {
  return [
    originalKey(imageKey),
    ...productImageVariants.map(({ width }) => variantKey(imageKey, width)),
  ]
}

function transparentCanvas() {
  const bytes = Uint8Array.from(atob(transparentPixel), (character) =>
    character.charCodeAt(0),
  )

  return new Blob([bytes])
}

/** Product CDNs link thumbnails; ask the same CDN for a large render instead. */
export function upgradedImageUrl(imageUrl: string) {
  const url = new URL(imageUrl)

  for (const parameter of ["w", "width", "imwidth", "sw"]) {
    if (url.searchParams.has(parameter)) {
      url.searchParams.set(parameter, String(preferredSourceWidth))
    }
  }

  for (const parameter of ["h", "height", "sh"]) {
    url.searchParams.delete(parameter)
  }

  // Shopify and friends encode the size in the file name: shoe_600x800.jpg
  url.pathname = url.pathname.replace(
    /_\d{2,4}x\d{0,4}(?=\.\w+$)/,
    `_${preferredSourceWidth}x`,
  )

  return url.href === imageUrl ? null : url.href
}

async function masterSize(source: Blob, images: ImagesBinding) {
  const largest = productImageVariants[productImageVariants.length - 1]
  let scale = 1

  try {
    const info = await images.info(source.stream())

    if ("width" in info) {
      scale = Math.min(maxMasterScale, Math.max(1, info.width / largest.width))
    }
  } catch {
    // Unknown source size: compose at variant size rather than upscaling.
  }

  return {
    width: Math.round(largest.width * scale),
    height: Math.round(largest.height * scale),
  }
}

/**
 * Segments the product once and centres it on a transparent canvas. Every
 * variant is then a plain downscale of this master, which keeps the framing
 * identical and antialiases the segmentation edge.
 */
async function renderCutoutMaster(source: Blob, images: ImagesBinding) {
  const { width, height } = await masterSize(source, images)
  const innerWidth = Math.round(width * subjectScale)
  const innerHeight = Math.round(height * subjectScale)
  const subject = images
    .input(source.stream())
    .transform({ segment: "foreground" })
    .transform({ trim: "border" })
    .transform({
      width: innerWidth,
      height: innerHeight,
      fit: "pad",
      background: "rgba(0,0,0,0)",
    })
  const master = await images
    .input(transparentCanvas().stream())
    .transform({ width, height, fit: "squeeze" })
    .draw(subject, {
      left: Math.round((width - innerWidth) * subjectPosition.x),
      top: Math.round((height - innerHeight) * subjectPosition.y),
    })
    .output({ format: "image/png" })

  return new Response(master.image()).blob()
}

function renderCutoutVariant(
  master: Blob,
  images: ImagesBinding,
  variant: ProductImageVariant,
) {
  return images
    .input(master.stream())
    .transform({ ...variant, fit: "squeeze" })
    .output({ format: "image/webp", quality: variantQuality })
}

function renderOriginalVariant(
  source: Blob,
  images: ImagesBinding,
  variant: ProductImageVariant,
) {
  return images
    .input(source.stream())
    .transform({
      ...variant,
      fit: "cover",
      gravity: "auto",
      sharpen: 1,
    })
    .output({ format: "image/webp", quality: variantQuality })
}

async function renderVariants(source: Blob, images: ImagesBinding) {
  try {
    const master = await renderCutoutMaster(source, images)
    const variants = await Promise.all(
      productImageVariants.map(async (variant) => ({
        width: variant.width,
        result: await renderCutoutVariant(master, images, variant),
      })),
    )

    return { backgroundRemoved: true, variants }
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "product background removal failed; using original image",
        error: error instanceof Error ? error.message : String(error),
      }),
    )

    const variants = await Promise.all(
      productImageVariants.map(async (variant) => ({
        width: variant.width,
        result: await renderOriginalVariant(source, images, variant),
      })),
    )

    return { backgroundRemoved: false, variants }
  }
}

async function readImage(response: Response) {
  if (!response.ok) {
    await response.body?.cancel()
    throw new ProductImageError(`Product image returned HTTP ${response.status}`)
  }

  const contentLength = Number(response.headers.get("content-length"))

  if (Number.isFinite(contentLength) && contentLength > maxSourceBytes) {
    await response.body?.cancel()
    throw new ProductImageError("Product image is larger than 20 MB")
  }

  if (!response.body) {
    throw new ProductImageError("Product image returned no data")
  }

  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0

  try {
    while (true) {
      const chunk = await reader.read()

      if (chunk.done) break

      bytesRead += chunk.value.byteLength

      if (bytesRead > maxSourceBytes) {
        throw new ProductImageError("Product image is larger than 20 MB")
      }

      chunks.push(chunk.value)
    }
  } catch (error) {
    try {
      await reader.cancel(error)
    } catch {
      // The stream may already be closed.
    }

    throw error
  } finally {
    reader.releaseLock()
  }

  return new Blob(chunks)
}

async function fetchImage(imageUrl: string, fetcher: ProductFetcher) {
  const { response } = await fetchPublicResource(
    imageUrl,
    { accept: "image/webp,image/jpeg,image/png,image/*;q=0.8" },
    fetcher,
  )

  return {
    contentType: response.headers.get("content-type") ?? undefined,
    source: await readImage(response),
  }
}

async function fetchSourceImage(imageUrl: string, fetcher: ProductFetcher) {
  const upgraded = upgradedImageUrl(imageUrl)

  if (upgraded) {
    try {
      return await fetchImage(upgraded, fetcher)
    } catch {
      // The CDN ignored our size hints; fall back to the linked image.
    }
  }

  return fetchImage(imageUrl, fetcher)
}

/** Accepts a link to download or an image the user uploaded themselves. */
export async function storeProductImage(
  image: string | Blob,
  bucket: R2Bucket,
  images: ImagesBinding,
  fetcher: ProductFetcher = fetch,
) {
  const { contentType: sourceContentType, source } =
    typeof image === "string"
      ? await fetchSourceImage(image, fetcher)
      : { contentType: image.type || undefined, source: image }
  const imageKey = crypto.randomUUID()
  const { backgroundRemoved, variants } = await renderVariants(source, images)

  const writes = await Promise.allSettled([
    bucket.put(originalKey(imageKey), source, {
      httpMetadata: sourceContentType
        ? { contentType: sourceContentType }
        : undefined,
    }),
    ...variants.map(({ width, result }) =>
      bucket.put(variantKey(imageKey, width), result.image(), {
        httpMetadata: {
          contentType: result.contentType(),
          cacheControl: "public, max-age=31536000, immutable",
        },
      }),
    ),
  ])
  const failedWrite = writes.find((write) => write.status === "rejected")

  if (failedWrite) {
    await deleteProductImage(bucket, imageKey)
    throw failedWrite.reason
  }

  return {
    processedImageKey: imageKey,
    backgroundRemoved,
    subjectScale,
    subjectPosition: { ...subjectPosition },
  } satisfies StoredProductImage
}

export function deleteProductImage(bucket: R2Bucket, imageKey: string) {
  return bucket.delete(allImageKeys(imageKey))
}

function requestedImageKeys(pathname: string) {
  const match = pathname.match(/^\/images\/([^/]+)\/(360|720|1080)\.webp$/)

  if (!match) return null

  try {
    const imageKey = decodeURIComponent(match[1] ?? "")

    if (!/^[a-zA-Z0-9_-]+$/.test(imageKey)) return null

    return {
      original: originalKey(imageKey),
      variant: variantKey(imageKey, Number(match[2]) as ProductImageWidth),
    }
  } catch {
    return null
  }
}

export async function serveProductImage(
  request: Request,
  bucket: R2Bucket,
): Promise<Response> {
  const keys = requestedImageKeys(new URL(request.url).pathname)

  if (!keys) return new Response("Not found", { status: 404 })

  const image =
    (await bucket.get(keys.variant)) ?? (await bucket.get(keys.original))
  if (!image) {
    return new Response("Not found", { status: 404 })
  }

  const headers = new Headers()
  image.writeHttpMetadata(headers)
  headers.set("etag", image.httpEtag)
  headers.set("content-length", image.size.toString())

  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=31536000, immutable")
  }

  return new Response(request.method === "HEAD" ? null : image.body, { headers })
}
