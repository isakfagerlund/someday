import { z } from "zod"

import type { ImageEvidence, ProductEvidence } from "./product-evidence"
import {
  fetchPublicResource,
  type ProductFetcher,
  validateProductUrl,
} from "./product-url"

const imageSchema = z.object({
  src: z.string(),
  alt: z.string().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
})

const shopifyProductSchema = z.object({
  product: z.object({
    title: z.string(),
    vendor: z.string().nullish(),
    product_type: z.string().nullish(),
    images: z.array(imageSchema),
  }),
})

const wooCommerceProductsSchema = z.array(
  z.object({
    name: z.string(),
    permalink: z.string().nullish(),
    brands: z.array(z.object({ name: z.string() })).nullish(),
    categories: z.array(z.object({ name: z.string() })).nullish(),
    images: z.array(imageSchema),
  }),
)

interface PlatformProduct {
  name: string
  brand?: string | null
  canonicalUrl?: string | null
  text?: string | null
  images: z.infer<typeof imageSchema>[]
}

interface Platform {
  /** Captures the path before the product segment and the product slug. */
  pathPattern: RegExp
  endpoint: (pageUrl: URL, base: string, slug: string) => URL
  product: (json: unknown) => PlatformProduct | null
}

const platforms: Platform[] = [
  {
    pathPattern: /^(.*)\/products\/([^/]+?)\/?$/,
    endpoint: (pageUrl, base, slug) =>
      new URL(`${base}/products/${slug}.json`, pageUrl),
    product(json) {
      const parsed = shopifyProductSchema.safeParse(json)
      if (!parsed.success) return null

      const { title, vendor, product_type, images } = parsed.data.product

      return { name: title, brand: vendor, text: product_type, images }
    },
  },
  {
    // WooCommerce translates the product base per locale (/de/produkt/…).
    pathPattern:
      /^(.*)\/(?:product|produkt|produit|prodotto|producto|produto)\/([^/]+?)\/?$/,
    endpoint(pageUrl, base, slug) {
      const url = new URL(`${base}/wp-json/wc/store/v1/products`, pageUrl)
      url.searchParams.set("slug", decodeURIComponent(slug))
      return url
    },
    product(json) {
      const product = wooCommerceProductsSchema.safeParse(json).data?.[0]
      if (!product) return null

      return {
        name: product.name,
        brand: product.brands?.[0]?.name,
        canonicalUrl: product.permalink,
        text: product.categories?.map((category) => category.name).join(", "),
        images: product.images,
      }
    },
  },
]

function publicUrl(value: string, baseUrl: URL) {
  try {
    return validateProductUrl(new URL(value, baseUrl)).href
  } catch {
    return null
  }
}

function toEvidence(pageUrl: URL, product: PlatformProduct): ProductEvidence | null {
  const images: ImageEvidence[] = []

  for (const image of product.images) {
    const url = publicUrl(image.src, pageUrl)
    if (!url) continue

    images.push({
      url,
      source: "platform",
      ...(image.alt ? { alt: image.alt } : {}),
      ...(image.width ? { width: image.width } : {}),
      ...(image.height ? { height: image.height } : {}),
    })
  }

  if (images.length === 0) return null

  return {
    pageUrl: pageUrl.href,
    canonicalUrl: product.canonicalUrl
      ? publicUrl(product.canonicalUrl, pageUrl)
      : null,
    title: product.name,
    metadata: {
      "og:title": product.name,
      ...(product.brand ? { "product:brand": product.brand } : {}),
    },
    jsonLd: [],
    text: product.text ?? "",
    images,
  }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) {
    await response.body?.cancel()
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

/**
 * Shopify and WooCommerce expose product JSON next to the HTML page, which
 * usually stays open when the page itself is blocked or rendered client-side.
 */
export async function fetchPlatformEvidence(
  pageUrl: URL,
  fetcher: ProductFetcher,
): Promise<ProductEvidence | null> {
  for (const platform of platforms) {
    const match = platform.pathPattern.exec(pageUrl.pathname)
    if (!match) continue

    const [, base = "", slug = ""] = match

    try {
      const { response } = await fetchPublicResource(
        platform.endpoint(pageUrl, base, slug),
        { accept: "application/json" },
        fetcher,
      )
      const product = platform.product(await readJson(response))

      if (product) return toEvidence(pageUrl, product)
    } catch {
      // A failed probe is not fatal; the caller has other fallbacks.
    }
  }

  return null
}
