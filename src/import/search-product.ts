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
    imageUrls: z.array(z.string()).max(12),
  })
  .strict()

const instructions = `Find the exact purchasable product at the supplied retailer URL.

Use the full URL, retailer domain, product slug, and product identifier to avoid similarly named products.
Return only details for that exact product.
Return direct, public image file URLs for the product itself, ordered with the best catalog image first.
Exclude logos, icons, placeholders, related products, and product page URLs.
Do not invent details or URLs.`

export class ProductSearchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductSearchError"
  }
}

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
    tools: [
      {
        type: "web_search_preview",
        search_content_types: ["text", "image"],
        search_context_size: "medium",
      },
    ],
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

  if (imageUrls.length === 0) {
    throw new ProductSearchError("Web search found no usable product images")
  }

  return { ...response.output_parsed, imageUrls: [...new Set(imageUrls)] }
}
