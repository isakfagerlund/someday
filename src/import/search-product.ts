import OpenAI from "openai"
import { zodTextFormat } from "openai/helpers/zod"
import { z } from "zod"

import { categories } from "../domain/product"
import { validateProductUrl } from "./product-url"

const searchResultSchema = z
  .object({
    name: z.string().trim().min(1),
    brand: z.string().trim().min(1),
    category: z.enum(categories),
    color: z.string().trim().nullable(),
    size: z.string().trim().nullable(),
    imageUrls: z.array(z.string()).max(12),
  })
  .strict()

const instructions = `Find the exact purchasable product at the supplied retailer URL.

Use the full URL, retailer domain, product slug, and product identifier to avoid similarly named products.
Return only details for that exact product.
Return the color and size only when the retailer states them for that exact product; otherwise return null.
Return a size only when the product is sold in a single size, and never list the sizes a shop offers.
Return direct, public image file URLs for the product itself, ordered with the best catalog image first.
Exclude logos, icons, placeholders, related products, and product page URLs.
Do not invent details or URLs.`

export class ProductSearchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductSearchError"
  }
}

// Image search uses the current tool; the preview endpoint rejects this option.
const imageSearch = {
  type: "web_search",
  search_content_types: ["text", "image"],
  search_context_size: "medium",
} as const

export async function searchProduct(openai: OpenAI, sourceUrl: string) {
  const response = await openai.responses.parse({
    model: "gpt-5.6-luna",
    instructions,
    input: `Product URL: ${sourceUrl}`,
    reasoning: { effort: "low" },
    max_output_tokens: 1_200,
    max_tool_calls: 2,
    store: false,
    tool_choice: "required",
    tools: [imageSearch],
    text: {
      format: zodTextFormat(searchResultSchema, "product_search_result"),
    },
  })

  if (!response.output_parsed) {
    throw new ProductSearchError("Web search did not find this product")
  }

  const imageUrls = response.output_parsed.imageUrls.flatMap((imageUrl) => {
    try {
      return [validateProductUrl(imageUrl).href]
    } catch {
      return []
    }
  })

  return {
    ...response.output_parsed,
    color: response.output_parsed.color || null,
    size: response.output_parsed.size || null,
    imageUrls: [...new Set(imageUrls)],
  }
}
