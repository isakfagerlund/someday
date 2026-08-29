import OpenAI from "openai"

import { insertProduct, productExists } from "../db/products"
import type { CatalogProduct } from "../domain/product"
import { deleteProductImage, storeProductImage } from "../images"
import { collectProductEvidence } from "./collect-product-evidence"
import {
  extractProductCandidate,
  validateProductCandidate,
} from "./product-candidate"
import { validateProductUrl } from "./product-url"

export class DuplicateProductError extends Error {
  constructor() {
    super("This product is already in the catalog")
    this.name = "DuplicateProductError"
  }
}

export class ProductImportError extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = "ProductImportError"
  }
}

async function removeFailedImage(bucket: R2Bucket, imageKey: string) {
  try {
    await deleteProductImage(bucket, imageKey)
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "failed to clean up product image",
        imageKey,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }
}

function isCanonicalUrlConflict(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("UNIQUE constraint failed: products.canonical_url")
  )
}

export async function importProduct(
  input: string,
  env: Env,
): Promise<CatalogProduct> {
  const sourceUrl = validateProductUrl(input).href

  let collected

  try {
    collected = await collectProductEvidence(sourceUrl, env.BROWSER)
  } catch (error) {
    throw new ProductImportError("Could not read this product page", error)
  }

  const expectedCanonicalUrl =
    collected.evidence.canonicalUrl ?? collected.evidence.pageUrl

  if (await productExists(env.DB, expectedCanonicalUrl)) {
    throw new DuplicateProductError()
  }

  let candidate

  try {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    const extracted = await extractProductCandidate(openai, collected.evidence)
    candidate = validateProductCandidate(extracted, collected.evidence)
  } catch (error) {
    throw new ProductImportError("Could not extract product details", error)
  }

  let imageKey

  try {
    imageKey = await storeProductImage(
      candidate.imageUrl,
      env.IMAGE_BUCKET,
      env.IMAGES,
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "product image import failed",
        imageUrl: candidate.imageUrl,
        error: error instanceof Error ? error.message : String(error),
      }),
    )

    throw new ProductImportError("Could not import the product image", error)
  }

  try {
    return await insertProduct(env.DB, {
      id: crypto.randomUUID(),
      sourceUrl,
      canonicalUrl: candidate.canonicalUrl,
      name: candidate.name,
      brand: candidate.brand,
      category: candidate.category,
      imageKey,
      importEvidence: collected,
    })
  } catch (error) {
    await removeFailedImage(env.IMAGE_BUCKET, imageKey)

    if (isCanonicalUrlConflict(error)) throw new DuplicateProductError()

    throw error
  }
}
