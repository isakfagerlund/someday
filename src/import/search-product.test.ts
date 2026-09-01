import OpenAI from "openai"
import { describe, expect, it, vi } from "vitest"

import { searchProduct } from "./search-product"

function openAIResponse(result: object) {
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
        content: [
          {
            type: "output_text",
            text: JSON.stringify(result),
            annotations: [],
          },
        ],
      },
    ],
  })
}

describe("searchProduct", () => {
  it("searches text and images for the exact product", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      openAIResponse({
        name: "Boat-neck lace mini dress",
        brand: "COS",
        category: "Clothing",
        imageUrls: [
          "https://images.example.com/dress.jpg",
          "https://images.example.com/dress.jpg",
          "data:image/png;base64,nope",
        ],
      }),
    )
    const openai = new OpenAI({ apiKey: "test", fetch: fetcher })

    await expect(
      searchProduct(
        openai,
        "https://www.cos.com/en/product/boat-neck-lace-mini-dress-blue-1358057001",
      ),
    ).resolves.toEqual({
      name: "Boat-neck lace mini dress",
      brand: "COS",
      category: "Clothing",
      imageUrls: ["https://images.example.com/dress.jpg"],
    })

    const request = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string) as {
      max_tool_calls: number
      tool_choice: string
      tools: unknown[]
    }

    expect(request).toMatchObject({
      max_tool_calls: 2,
      tool_choice: "required",
      tools: [
        {
          type: "web_search_preview",
          search_content_types: ["text", "image"],
          search_context_size: "medium",
        },
      ],
    })
  })
})
