import { fetchPublicResource, type ProductFetcher } from "./import/product-url"

const maxSourceBytes = 20_000_000
const productImageDirectory = "products"
const subjectScale = 0.8
const subjectPosition = { x: 0.5, y: 0.5 } as const
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

async function renderCutoutVariant(
  source: Blob,
  images: ImagesBinding,
  variant: ProductImageVariant,
) {
  const innerWidth = Math.round(variant.width * subjectScale)
  const innerHeight = Math.round(variant.height * subjectScale)
  const cutout = images
    .input(source.stream())
    .transform({ segment: "foreground" })
    .transform({ trim: "border" })
    .transform({
      width: innerWidth,
      height: innerHeight,
      fit: "pad",
      background: "rgba(0,0,0,0)",
    })

  return images
    .input(transparentCanvas().stream())
    .transform({ ...variant, fit: "squeeze" })
    .draw(cutout, {
      left: Math.round((variant.width - innerWidth) * subjectPosition.x),
      top: Math.round((variant.height - innerHeight) * subjectPosition.y),
    })
    .output({ format: "image/webp", quality: 85 })
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
    .output({ format: "image/webp", quality: 85 })
}

async function renderVariants(source: Blob, images: ImagesBinding) {
  try {
    const variants = await Promise.all(
      productImageVariants.map(async (variant) => ({
        width: variant.width,
        result: await renderCutoutVariant(source, images, variant),
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

export async function storeProductImage(
  imageUrl: string,
  bucket: R2Bucket,
  images: ImagesBinding,
  fetcher: ProductFetcher = fetch,
) {
  const { response } = await fetchPublicResource(
    imageUrl,
    { accept: "image/webp,image/jpeg,image/png,image/*;q=0.8" },
    fetcher,
  )
  const sourceContentType = response.headers.get("content-type") ?? undefined
  const source = await readImage(response)
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
