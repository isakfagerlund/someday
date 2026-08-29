import OpenAI from "openai"
import { describe, expect, it, vi } from "vitest"

import {
  extractProductCandidate,
  ProductCandidateError,
  validateProductCandidate,
} from "./product-candidate"
import type { ProductEvidence } from "./product-evidence"

const evidence: ProductEvidence = {
  pageUrl: "https://shop.example.com/products/lamp",
  canonicalUrl: "https://shop.example.com/products/pleated-lamp",
  title: "Pleated Lamp",
  metadata: {
    "og:title": "Pleated Lamp",
    "product:brand": "Hay",
  },
  jsonLd: [{ "@type": "Product", name: "Pleated Lamp", brand: "Hay" }],
  text: "Pleated Lamp. A soft paper shade.",
  images: [
    {
      url: "https://shop.example.com/images/pleated-lamp.jpg",
      source: "open-graph",
    },
  ],
}

function openAIResponse(content: object) {
  return Response.json({
    id: "resp_test",
    object: "response",
    created_at: 0,
    status: "completed",
    model: "gpt-5.6-luna",
    output: [
      {
        id: "msg_test",
        type: "message",
        role: "assistant",
        status: "completed",
        content: [content],
      },
    ],
  })
}

describe("extractProductCandidate", () => {
  it("uses GPT-5.6 Luna with a strict Zod output schema", async () => {
    const candidate = {
      name: "Pleated Lamp",
      brand: "Hay",
      canonicalUrl: "https://shop.example.com/products/pleated-lamp",
      category: "Other",
      imageUrl: "https://shop.example.com/images/pleated-lamp.jpg",
    }
    const fetcher = vi.fn().mockResolvedValue(
      openAIResponse({
        type: "output_text",
        text: JSON.stringify(candidate),
        annotations: [],
      }),
    )
    const openai = new OpenAI({ apiKey: "test", fetch: fetcher })

    await expect(extractProductCandidate(openai, evidence)).resolves.toEqual(
      candidate,
    )

    const request = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string) as {
      model: string
      reasoning: { effort: string }
      store: boolean
      tools: unknown[]
      text: { format: { strict: boolean; schema: object } }
    }

    expect(request).toMatchObject({
      model: "gpt-5.6-luna",
      reasoning: { effort: "low" },
      store: false,
      tools: [],
      text: { format: { strict: true } },
    })
    expect(request.text.format.schema).toMatchObject({
      additionalProperties: false,
      required: ["name", "brand", "canonicalUrl", "category", "imageUrl"],
    })
  })

  it("rejects a refusal instead of inventing a candidate", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      openAIResponse({ type: "refusal", refusal: "I cannot extract this page." }),
    )
    const openai = new OpenAI({ apiKey: "test", fetch: fetcher })

    await expect(extractProductCandidate(openai, evidence)).rejects.toThrow(
      ProductCandidateError,
    )
  })
})

describe("validateProductCandidate", () => {
  const candidate = {
    name: "Pleated Lamp",
    brand: "Hay",
    canonicalUrl: "https://shop.example.com/products/pleated-lamp",
    category: "Other" as const,
    imageUrl: "https://shop.example.com/images/pleated-lamp.jpg",
  }

  it("accepts canonical and image URLs grounded in the evidence", () => {
    expect(validateProductCandidate(candidate, evidence)).toEqual(candidate)
  })

  it("rejects an image the model invented", () => {
    expect(() =>
      validateProductCandidate(
        { ...candidate, imageUrl: "https://other.example.com/invented.jpg" },
        evidence,
      ),
    ).toThrow(ProductCandidateError)
  })

  it("rejects a canonical URL the model invented", () => {
    expect(() =>
      validateProductCandidate(
        {
          ...candidate,
          canonicalUrl: "https://shop.example.com/products/another-lamp",
        },
        evidence,
      ),
    ).toThrow(ProductCandidateError)
  })
})
