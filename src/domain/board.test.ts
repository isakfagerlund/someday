import { describe, expect, it } from "vitest"

import { boardSlugFromName, uniqueBoardSlug } from "./board"

describe("board slugs", () => {
  it("turns a board name into a readable slug", () => {
    expect(boardSlugFromName("  Isak's Café Finds  ")).toBe(
      "isaks-cafe-finds",
    )
  })

  it("adds a suffix when a slug is unavailable", () => {
    expect(uniqueBoardSlug("Someday", ["someday", "someday-2"])).toBe(
      "someday-3",
    )
    expect(uniqueBoardSlug("API", [])).toBe("api-2")
  })
})
