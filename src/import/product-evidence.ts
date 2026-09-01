import { validateProductUrl } from "./product-url"

const maxDocumentBytes = 4_000_000
const maxJsonLdCharacters = 60_000
const maxTextCharacters = 12_000
const maxTitleCharacters = 500
const maxImages = 24

const metadataNames = new Set([
  "application-name",
  "brand",
  "og:brand",
  "og:image",
  "og:image:secure_url",
  "og:site_name",
  "og:title",
  "og:type",
  "product:brand",
  "twitter:image",
  "twitter:image:src",
  "twitter:title",
])

export type ImageEvidenceSource =
  | "html"
  | "json-ld"
  | "open-graph"
  | "twitter"

export interface ImageEvidence {
  url: string
  source: ImageEvidenceSource
  alt?: string
  height?: number
  width?: number
}

export interface ProductEvidence {
  pageUrl: string
  canonicalUrl: string | null
  title: string | null
  metadata: Record<string, string>
  jsonLd: unknown[]
  text: string
  images: ImageEvidence[]
}

export class ProductEvidenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductEvidenceError"
  }
}

function appendWithinLimit(current: string, value: string, limit: number) {
  return current + value.slice(0, Math.max(0, limit - current.length))
}

function normalizedText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function largestSrcsetCandidate(value: string | null) {
  let largest:
    | { url: string; width?: number; score: number }
    | undefined

  for (const candidate of value?.split(",") ?? []) {
    const [url, descriptor] = candidate.trim().split(/\s+/, 2)
    if (!url) continue

    const size = Number(descriptor?.slice(0, -1))
    const score = Number.isFinite(size) ? size : 1
    const width = descriptor?.endsWith("w") ? size : undefined

    if (!largest || score > largest.score) {
      largest = {
        url,
        score,
        ...(width ? { width } : {}),
      }
    }
  }

  return largest
}

function productJsonLdImages(
  value: unknown,
  addImage: (value: string) => void,
): void {
  if (Array.isArray(value)) {
    for (const item of value) productJsonLdImages(item, addImage)
    return
  }

  if (!value || typeof value !== "object") return

  const record = value as Record<string, unknown>
  const types = Array.isArray(record["@type"])
    ? record["@type"]
    : [record["@type"]]

  if (types.includes("Product")) {
    const images = Array.isArray(record.image) ? record.image : [record.image]

    for (const image of images) {
      if (typeof image === "string") {
        addImage(image)
      } else if (image && typeof image === "object") {
        const imageRecord = image as Record<string, unknown>
        const imageUrl = imageRecord.url ?? imageRecord.contentUrl

        if (typeof imageUrl === "string") addImage(imageUrl)
      }
    }
  }

  productJsonLdImages(record["@graph"], addImage)
}

function resolvedPublicUrl(value: string, baseUrl: URL) {
  try {
    return validateProductUrl(new URL(value.replaceAll("&amp;", "&"), baseUrl))
  } catch {
    return null
  }
}

async function consumeBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) {
    throw new ProductEvidenceError("Product page returned no HTML")
  }

  const reader = body.getReader()
  let bytesRead = 0

  try {
    while (true) {
      const chunk = await reader.read()

      if (chunk.done) return

      bytesRead += chunk.value.byteLength

      if (bytesRead > maxDocumentBytes) {
        throw new ProductEvidenceError("Product page HTML is too large")
      }
    }
  } catch (error) {
    try {
      await reader.cancel(error)
    } catch {
      // The stream may already be closed by HTMLRewriter.
    }

    throw error
  } finally {
    reader.releaseLock()
  }
}

export async function extractProductEvidence(
  response: Response,
  pageUrl: URL,
): Promise<ProductEvidence> {
  if (!response.ok) {
    await response.body?.cancel()
    throw new ProductEvidenceError(
      `Product page returned HTTP ${response.status}`,
    )
  }

  const contentType = response.headers.get("content-type")
  const mediaType = contentType?.split(";", 1)[0].trim().toLowerCase()

  if (mediaType !== "text/html" && mediaType !== "application/xhtml+xml") {
    await response.body?.cancel()
    throw new ProductEvidenceError("Product URL did not return HTML")
  }

  const contentLength = Number(response.headers.get("content-length"))

  if (Number.isFinite(contentLength) && contentLength > maxDocumentBytes) {
    await response.body?.cancel()
    throw new ProductEvidenceError("Product page HTML is too large")
  }

  const metadata: Record<string, string> = {}
  const jsonLd: unknown[] = []
  const images: ImageEvidence[] = []
  const imagesByUrl = new Map<string, ImageEvidence>()
  let canonicalUrl: string | null = null
  let documentBaseUrl = pageUrl
  let title = ""
  let visibleText = ""
  let jsonLdCharacters = 0

  function addImage(
    value: string | null,
    source: ImageEvidenceSource,
    width?: number,
    height?: number,
    alt?: string,
  ) {
    if (!value) return

    const url = resolvedPublicUrl(value, documentBaseUrl)

    if (!url) return

    const existing = imagesByUrl.get(url.href)

    if (existing) {
      if (width && (!existing.width || width > existing.width)) {
        existing.width = width
      }
      if (height && (!existing.height || height > existing.height)) {
        existing.height = height
      }
      if (alt && !existing.alt) existing.alt = alt

      return
    }

    if (images.length >= maxImages) return

    const image = {
      url: url.href,
      source,
      ...(alt ? { alt } : {}),
      ...(height ? { height } : {}),
      ...(width ? { width } : {}),
    }
    imagesByUrl.set(url.href, image)
    images.push(image)
  }

  const titleHandler: HTMLRewriterElementContentHandlers = {
    text(chunk) {
      title = appendWithinLimit(title, chunk.text, maxTitleCharacters)
    },
  }

  const textHandler: HTMLRewriterElementContentHandlers = {
    text(chunk) {
      visibleText = appendWithinLimit(
        visibleText,
        `${chunk.text}${chunk.lastInTextNode ? " " : ""}`,
        maxTextCharacters,
      )
    },
  }

  let currentJsonLd = ""
  let collectingJsonLd = false
  let truncatedJsonLd = false

  const jsonLdHandler: HTMLRewriterElementContentHandlers = {
    element(element) {
      collectingJsonLd =
        element.getAttribute("type")?.trim().toLowerCase() ===
        "application/ld+json"
      currentJsonLd = ""
      truncatedJsonLd = false

      if (!collectingJsonLd) return

      element.onEndTag(() => {
        if (!truncatedJsonLd) {
          try {
            const parsed = JSON.parse(currentJsonLd) as unknown
            jsonLd.push(parsed)
            productJsonLdImages(parsed, (value) => addImage(value, "json-ld"))
          } catch {
            // Some shops publish malformed JSON-LD. Other evidence can still work.
          }
        }

        jsonLdCharacters += currentJsonLd.length
        collectingJsonLd = false
      })
    },
    text(chunk) {
      if (!collectingJsonLd) return

      const remaining = maxJsonLdCharacters - jsonLdCharacters

      if (chunk.text.length > remaining - currentJsonLd.length) {
        truncatedJsonLd = true
      }

      currentJsonLd = appendWithinLimit(currentJsonLd, chunk.text, remaining)
    },
  }

  const transformedResponse = new HTMLRewriter()
    .on("base[href]", {
      element(element) {
        const baseUrl = resolvedPublicUrl(
          element.getAttribute("href") ?? "",
          pageUrl,
        )

        if (baseUrl) documentBaseUrl = baseUrl
      },
    })
    .on("link[rel]", {
      element(element) {
        const relationships =
          element.getAttribute("rel")?.toLowerCase().split(/\s+/) ?? []
        const href = element.getAttribute("href")

        if (relationships.includes("canonical") && !canonicalUrl && href) {
          canonicalUrl = resolvedPublicUrl(href, documentBaseUrl)?.href ?? null
        }

        if (relationships.includes("image_src")) addImage(href, "html")
      },
    })
    .on("meta", {
      element(element) {
        const name = (
          element.getAttribute("property") ?? element.getAttribute("name")
        )
          ?.trim()
          .toLowerCase()
        const content = element.getAttribute("content")

        if (!name || !content || !metadataNames.has(name)) return

        metadata[name] ??= normalizedText(content).slice(0, 1_000)

        if (name === "og:image" || name === "og:image:secure_url") {
          addImage(content, "open-graph")
        } else if (name === "twitter:image" || name === "twitter:image:src") {
          addImage(content, "twitter")
        }
      },
    })
    .on("source[srcset]", {
      element(element) {
        const candidate = largestSrcsetCandidate(
          element.getAttribute("srcset"),
        )

        if (candidate) addImage(candidate.url, "html", candidate.width)
      },
    })
    .on("img", {
      element(element) {
        const declaredWidth = Number(element.getAttribute("width"))
        const declaredHeight = Number(element.getAttribute("height"))
        const width = Number.isFinite(declaredWidth) ? declaredWidth : undefined
        const height = Number.isFinite(declaredHeight)
          ? declaredHeight
          : undefined
        const alt = normalizedText(element.getAttribute("alt") ?? "") || undefined

        for (const attribute of [
          "src",
          "data-src",
          "data-original",
          "data-lazy-src",
        ]) {
          addImage(element.getAttribute(attribute), "html", width, height, alt)
        }

        const candidate = largestSrcsetCandidate(
          element.getAttribute("srcset"),
        )

        if (candidate) {
          addImage(
            candidate.url,
            "html",
            candidate.width,
            height,
            alt,
          )
        }
      },
    })
    .on("title", titleHandler)
    .on("script", jsonLdHandler)
    .on("h1, h2, h3, p, li, [itemprop='name'], [itemprop='brand']", textHandler)
    .transform(response)

  await consumeBody(transformedResponse.body)

  return {
    pageUrl: pageUrl.href,
    canonicalUrl,
    title: normalizedText(title) || null,
    metadata,
    jsonLd,
    text: normalizedText(visibleText),
    images,
  }
}
