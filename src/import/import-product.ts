import OpenAI from "openai"

import { insertProduct, productExists } from "../db/products"
import type { CatalogProduct } from "../domain/product"
import { deleteProductImage, storeProductImage } from "../images"
import { collectProductEvidence } from "./collect-product-evidence"
import {
  extractProductCandidate,
  validateProductCandidate,
} from "./product-candidate"
import { productFallbackFromUrl } from "./product-fallback"
import { validateProductUrl } from "./product-url"

export class DuplicateProductError extends Error {
  constructor() {
    super("This product is already in the catalog")
    this.name = "DuplicateProductError"
  }
}

async function removeFailedImage(bucket: R2Bucket, processedImageKey: string) {
  try {
    await deleteProductImage(bucket, processedImageKey)
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "failed to clean up product image",
        processedImageKey,
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
  let details = productFallbackFromUrl(sourceUrl)
  let imageUrl = ""
  let importEvidence: unknown = { method: "fallback" }
  let duplicateChecked = false

  try {
    const collected = await collectProductEvidence(sourceUrl, env.BROWSER)
    const expectedCanonicalUrl =
      collected.evidence.canonicalUrl ?? collected.evidence.pageUrl

    details = { ...details, canonicalUrl: expectedCanonicalUrl }
    importEvidence = collected

    if (await productExists(env.DB, expectedCanonicalUrl)) {
      throw new DuplicateProductError()
    }
    duplicateChecked = true

    try {
      const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
      const extracted = await extractProductCandidate(openai, collected.evidence)
      const candidate = validateProductCandidate(extracted, collected.evidence)

      details = candidate
      imageUrl = candidate.imageUrl
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "product details import failed; using URL fallback",
          sourceUrl,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  } catch (error) {
    if (error instanceof DuplicateProductError) throw error

    console.error(
      JSON.stringify({
        message: "product page import failed; using URL fallback",
        sourceUrl,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }

  if (!duplicateChecked && (await productExists(env.DB, details.canonicalUrl))) {
    throw new DuplicateProductError()
  }

  let image = {
    processedImageKey: "",
    backgroundRemoved: false,
    subjectScale: 0.8,
    subjectPosition: { x: 0.5, y: 0.5 },
  }

  if (imageUrl) {
    try {
      image = await storeProductImage(imageUrl, env.IMAGE_BUCKET, env.IMAGES)
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "product image import failed; saving without an image",
          imageUrl,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }

  try {
    return await insertProduct(env.DB, {
      id: crypto.randomUUID(),
      sourceUrl,
      ...details,
      originalImageUrl: image.processedImageKey ? imageUrl : "",
      ...image,
      importEvidence,
    })
  } catch (error) {
    if (image.processedImageKey) {
      await removeFailedImage(env.IMAGE_BUCKET, image.processedImageKey)
    }

    if (isCanonicalUrlConflict(error)) throw new DuplicateProductError()

    throw error
  }
}
