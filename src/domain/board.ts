export const reservedBoardSlugs = new Set([
  "api",
  "auth",
  "catalog",
  "health",
  "images",
])

export function boardSlugFromName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function uniqueBoardSlug(name: string, existingSlugs: string[]) {
  const baseSlug = boardSlugFromName(name)
  const unavailableSlugs = new Set([
    ...reservedBoardSlugs,
    ...existingSlugs,
  ])
  let slug = baseSlug
  let suffix = 2

  while (unavailableSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return slug
}
