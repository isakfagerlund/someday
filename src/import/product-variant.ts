import { fetchShopifyVariant } from "./platform-product"
import type { ProductFetcher } from "./product-url"

export interface ProductVariant {
  color: string | null
  size: string | null
}

// Shops name the parameter that pins a size; Salesforce Commerce prefixes it
// with the product id (dwvar_1358057_size).
const sizeParameter =
  /^(?:dwvar_.+_)?(?:size|sizecode|sizename|sizelabel|productsize|variantsize|taille|talla|storlek)$/i

/** Season codes and internal ids ride in the same parameters; those are not sizes. */
function readableSize(value: string) {
  const size = value.trim()

  if (!size || size.length > 12 || /^\d{5,}$/.test(size)) return null

  return size
}

function sizeFromParameters(pageUrl: URL) {
  for (const [name, value] of pageUrl.searchParams) {
    if (!sizeParameter.test(name)) continue

    const size = readableSize(value)
    if (size) return size
  }

  return null
}

/**
 * The saved link decides the size. Someone who shares a wishlist expects the
 * buyer to land on that exact variant, so whatever the URL pins outranks the
 * page text and the model. Never throws: an unknown size stays null.
 */
export async function variantFromUrl(
  pageUrl: URL,
  fetcher: ProductFetcher = fetch,
): Promise<ProductVariant> {
  const pinned = await fetchShopifyVariant(pageUrl, fetcher)

  return {
    color: pinned?.color ?? null,
    size: pinned?.size ?? sizeFromParameters(pageUrl),
  }
}
