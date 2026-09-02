import OpenAI from "openai"

import { insertProduct, productExists } from "../db/products"
import type { CatalogProduct, Category } from "../domain/product"
import { deleteProductImage, storeProductImage } from "../images"
import { collectProductEvidence } from "./collect-product-evidence"
import {
  extractProductCandidate,
  validateProductCandidate,
} from "./product-candidate"
import type {
  ImageEvidenceSource,
  ProductEvidence,
} from "./product-evidence"
import { productFallbackFromUrl } from "./product-fallback"
import { validateProductUrl } from "./product-url"
import { searchProduct } from "./search-product"

export type ProductImportMethod =
  | "direct"
  | "fallback"
  | "platform"
  | "rendered"
  | "search"

export interface ProductImportPreview {
  sourceUrl: string
  canonicalUrl: string
  name: string
  brand: string
  category: Category
  imageUrls: string[]
  recommendedImageUrl: string
  method: ProductImportMethod
  warning: string | null
}

export interface ProductImportConfirmation {
  sourceUrl: string
  canonicalUrl: string
  name: string
  brand: string
  category: Category
  imageUrl: string
  method: ProductImportMethod
}

export class DuplicateProductError extends Error {
  constructor() {
    super("This product is already in the catalog")
    this.name = "DuplicateProductError"
  }
}

export class ProductImageImportError extends Error {
  constructor() {
    super("That image could not be downloaded. Choose another one.")
    this.name = "ProductImageImportError"
  }
}

function imageIdentity(imageUrl: string) {
  const url = new URL(imageUrl)

  for (const parameter of [
    "bg",
    "f",
    "fit",
    "fm",
    "format",
    "h",
    "height",
    "imwidth",
    "q",
    "quality",
    "w",
    "width",
  ]) {
    url.searchParams.delete(parameter)
  }

  return url.href
}

export function productImageChoices(
  evidence: ProductEvidence,
  recommendedImageUrl = "",
) {
  const priority: Record<ImageEvidenceSource, number> = {
    "json-ld": 0,
    platform: 0,
    "open-graph": 1,
    twitter: 2,
    html: 3,
  }
  const ordered = [
    recommendedImageUrl,
    ...evidence.images
      .slice()
      .sort(
        (left, right) =>
          priority[left.source] - priority[right.source] ||
          (right.width ?? 0) - (left.width ?? 0),
      )
      .map((image) => image.url),
  ]
  const identities = new Set<string>()
  const choices: string[] = []

  for (const imageUrl of ordered) {
    if (!imageUrl) continue

    const identity = imageIdentity(imageUrl)
    if (identities.has(identity)) continue

    identities.add(identity)
    choices.push(imageUrl)

    if (choices.length === 12) break
  }

  return choices
}

function loggedError(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function searchPreview(
  openai: OpenAI,
  sourceUrl: string,
): Promise<ProductImportPreview> {
  const result = await searchProduct(openai, sourceUrl)

  return {
    sourceUrl,
    canonicalUrl: sourceUrl,
    name: result.name,
    brand: result.brand,
    category: result.category,
    imageUrls: result.imageUrls,
    recommendedImageUrl: result.imageUrls[0] ?? "",
    method: "search",
    warning:
      result.imageUrls.length > 0
        ? "This shop blocked direct access, so we found the product via search."
        : "This shop blocked direct access. We found the details via search, but you need to paste an image link.",
  }
}

export async function previewProduct(
  input: string,
  env: Env,
): Promise<ProductImportPreview> {
  const sourceUrl = validateProductUrl(input).href
  const fallback = productFallbackFromUrl(sourceUrl)
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  let collected: Awaited<ReturnType<typeof collectProductEvidence>>

  try {
    collected = await collectProductEvidence(sourceUrl, env.BROWSER)
  } catch (pageError) {
    console.error(
      JSON.stringify({
        message: "product page import failed; trying web search",
        sourceUrl,
        error: loggedError(pageError),
      }),
    )

    try {
      return await searchPreview(openai, sourceUrl)
    } catch (searchError) {
      console.error(
        JSON.stringify({
          message: "product search fallback failed",
          sourceUrl,
          error: loggedError(searchError),
        }),
      )

      return {
        sourceUrl,
        ...fallback,
        imageUrls: [],
        recommendedImageUrl: "",
        method: "fallback",
        warning:
          "We could not read this shop. Paste an image link and check the details after adding.",
      }
    }
  }

  const canonicalUrl =
    collected.evidence.canonicalUrl ?? collected.evidence.pageUrl

  try {
    const extracted = await extractProductCandidate(openai, collected.evidence)
    const candidate = validateProductCandidate(extracted, collected.evidence)
    const imageUrls = productImageChoices(collected.evidence, candidate.imageUrl)

    return {
      sourceUrl,
      ...candidate,
      imageUrls,
      recommendedImageUrl: candidate.imageUrl,
      method: collected.method,
      warning: null,
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "product details import failed; showing extracted images",
        sourceUrl,
        error: loggedError(error),
      }),
    )

    const imageUrls = productImageChoices(collected.evidence)

    return {
      sourceUrl,
      ...fallback,
      canonicalUrl,
      imageUrls,
      recommendedImageUrl: imageUrls[0] ?? "",
      method: collected.method,
      warning: "We could not verify every detail. You can edit them after adding it.",
    }
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
        error: loggedError(error),
      }),
    )
  }
}

function isCanonicalUrlConflict(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("products.canonical_url")
  )
}

export async function createProduct(
  confirmation: ProductImportConfirmation,
  boardId: string,
  env: Env,
): Promise<CatalogProduct> {
  const sourceUrl = validateProductUrl(confirmation.sourceUrl).href
  const canonicalUrl = validateProductUrl(confirmation.canonicalUrl).href
  const imageUrl = validateProductUrl(confirmation.imageUrl).href

  if (await productExists(env.DB, boardId, canonicalUrl)) {
    throw new DuplicateProductError()
  }

  let image

  try {
    image = await storeProductImage(imageUrl, env.IMAGE_BUCKET, env.IMAGES)
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "product image import failed",
        imageUrl,
        error: loggedError(error),
      }),
    )
    throw new ProductImageImportError()
  }

  try {
    return await insertProduct(env.DB, boardId, {
      id: crypto.randomUUID(),
      sourceUrl,
      canonicalUrl,
      name: confirmation.name,
      brand: confirmation.brand,
      category: confirmation.category,
      originalImageUrl: imageUrl,
      ...image,
      importEvidence: {
        method: confirmation.method,
        selectedByUser: true,
      },
    })
  } catch (error) {
    await removeFailedImage(env.IMAGE_BUCKET, image.processedImageKey)

    if (isCanonicalUrlConflict(error)) throw new DuplicateProductError()

    throw error
  }
}
