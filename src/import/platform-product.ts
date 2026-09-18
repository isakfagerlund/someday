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
    options: z
      .array(z.object({ name: z.string(), values: z.array(z.string()) }))
      .nullish(),
    variants: z
      .array(
        z.object({
          id: z.number(),
          title: z.string(),
          option1: z.string().nullish(),
          option2: z.string().nullish(),
          option3: z.string().nullish(),
        }),
      )
      .nullish(),
    images: z.array(imageSchema),
  }),
})

type ShopifyProduct = z.infer<typeof shopifyProductSchema>["product"]

const shopifyPath = /^(.*)\/products\/([^/]+?)\/?$/

function shopifyEndpoint(pageUrl: URL, base: string, slug: string) {
  return new URL(`${base}/products/${slug}.json`, pageUrl)
}

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
  product: (json: unknown, pageUrl: URL) => PlatformProduct | null
}

const platforms: Platform[] = [
  {
    pathPattern: shopifyPath,
    endpoint: shopifyEndpoint,
    product(json, pageUrl) {
      const parsed = shopifyProductSchema.safeParse(json)
      if (!parsed.success) return null

      const { title, vendor, product_type, images } = parsed.data.product
      const details = shopifyVariantText(parsed.data.product, pageUrl)

      return {
        name: title,
        brand: vendor,
        text: [product_type, ...details].filter(Boolean).join(". "),
        images,
      }
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

/** Colors and sizes live in the variants; a pinned ?variant= names the exact one. */
function shopifyVariantText(product: ShopifyProduct, pageUrl: URL) {
  const variantId = pageUrl.searchParams.get("variant")
  const selected = product.variants?.find(
    (variant) => String(variant.id) === variantId,
  )

  if (selected) return [`Selected variant: ${selected.title}`]

  return (product.options ?? []).map(
    (option) => `${option.name}: ${option.values.join(", ")}`,
  )
}

const colorOption = /^(?:colou?rs?|colorway|farbe|couleur|f\u00e4rg)$/i
const sizeOption = /^(?:sizes?|gr\u00f6\u00dfe|gr\u00f6sse|taille|talla|storlek)$/i

function variantOption(
  product: ShopifyProduct,
  variant: NonNullable<ShopifyProduct["variants"]>[number],
  names: RegExp,
) {
  const index = (product.options ?? []).findIndex((option) =>
    names.test(option.name.trim()),
  )
  const values = [variant.option1, variant.option2, variant.option3]

  return (index === -1 ? null : values[index]?.trim()) || null
}

/**
 * Resolves a pinned ?variant= against the shop's own variant table, which is the
 * only place that says which size the saved link points at.
 */
export async function fetchShopifyVariant(
  pageUrl: URL,
  fetcher: ProductFetcher = fetch,
) {
  const variantId = pageUrl.searchParams.get("variant")
  const match = shopifyPath.exec(pageUrl.pathname)

  if (!variantId || !match) return null

  const [, base = "", slug = ""] = match

  try {
    const { response } = await fetchPublicResource(
      shopifyEndpoint(pageUrl, base, slug),
      { accept: "application/json" },
      fetcher,
    )
    const product = shopifyProductSchema.safeParse(await readJson(response)).data
      ?.product
    const variant = product?.variants?.find(
      (candidate) => String(candidate.id) === variantId,
    )

    if (!product || !variant) return null

    return {
      color: variantOption(product, variant, colorOption),
      size: variantOption(product, variant, sizeOption),
    }
  } catch {
    // A shop that hides its product JSON simply leaves the size unknown.
    return null
  }
}

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
      const product = platform.product(await readJson(response), pageUrl)

      if (product) return toEvidence(pageUrl, product)
    } catch {
      // A failed probe is not fatal; the caller has other fallbacks.
    }
  }

  return null
}
