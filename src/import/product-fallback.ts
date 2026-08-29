import type { Category } from "../domain/product"

const commonSubdomains = new Set(["shop", "store", "www"])

function titleCase(value: string) {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

function categoryFromPath(pathname: string): Category {
  if (/accessor|bag|jewel|watch|eyewear/.test(pathname)) return "Accessories"
  if (/tech|electronic|computer|phone|audio|headphone/.test(pathname)) return "Tech"
  if (/cloth|dress|footwear|menswear|shoe|shirt|womenswear/.test(pathname)) {
    return "Clothing"
  }

  return "Other"
}

export function productFallbackFromUrl(sourceUrl: string) {
  const url = new URL(sourceUrl)
  const hostnameParts = url.hostname.toLowerCase().split(".")
  const brandPart =
    hostnameParts.find((part) => !commonSubdomains.has(part)) ?? hostnameParts[0] ?? ""
  const brand = brandPart.length <= 4 ? brandPart.toUpperCase() : titleCase(brandPart)
  const lastPathPart = decodeURIComponent(
    url.pathname.split("/").filter(Boolean).at(-1) ?? "",
  )
  const name = titleCase(lastPathPart.replace(/[-.]?\d{6,}$/, ""))

  return {
    canonicalUrl: url.href,
    name: name || `Product from ${brand}`,
    brand,
    category: categoryFromPath(url.pathname.toLowerCase()),
  }
}
