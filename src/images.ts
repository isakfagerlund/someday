import { fetchPublicResource, type ProductFetcher } from "./import/product-url"

const maxSourceBytes = 20_000_000
const productImageDirectory = "products"

export const productImageVariants = [
  { width: 360, height: 450 },
  { width: 720, height: 900 },
  { width: 1080, height: 1350 },
] as const

type ProductImageWidth = (typeof productImageVariants)[number]["width"]

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
    "image/webp,image/jpeg,image/png,image/*;q=0.8",
    fetcher,
  )
  const sourceContentType = response.headers.get("content-type") ?? undefined
  const source = await readImage(response)
  const imageKey = crypto.randomUUID()

  const variants = await Promise.all(
    productImageVariants.map(async (variant) => ({
      width: variant.width,
      result: await images
        .input(source.stream())
        .transform({
          ...variant,
          fit: "cover",
          gravity: "auto",
          sharpen: 1,
        })
        .output({ format: "image/webp", quality: 85 }),
    })),
  )

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

  return imageKey
}

export function deleteProductImage(bucket: R2Bucket, imageKey: string) {
  return bucket.delete(allImageKeys(imageKey))
}

function requestedVariant(pathname: string) {
  const match = pathname.match(/^\/images\/([^/]+)\/(360|720|1080)\.webp$/)

  if (!match) return null

  try {
    const imageKey = decodeURIComponent(match[1] ?? "")

    if (!/^[a-zA-Z0-9_-]+$/.test(imageKey)) return null

    return variantKey(imageKey, Number(match[2]) as ProductImageWidth)
  } catch {
    return null
  }
}

export async function serveProductImage(
  request: Request,
  bucket: R2Bucket,
): Promise<Response> {
  const key = requestedVariant(new URL(request.url).pathname)

  if (!key) return new Response("Not found", { status: 404 })

  const image = await bucket.get(key)
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
