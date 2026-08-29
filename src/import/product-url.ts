const blockedDomainSuffixes = [
  "internal",
  "lan",
  "local",
  "localdomain",
  "localhost",
] as const

const redirectStatuses = new Set([301, 302, 303, 307, 308])
const maxRedirects = 5

export class ProductUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ProductUrlError"
  }
}

function isIpAddress(hostname: string) {
  return hostname.includes(":") || /^\d+(?:\.\d+){3}$/.test(hostname)
}

function isBlockedDomain(hostname: string) {
  return blockedDomainSuffixes.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  )
}

export function validateProductUrl(input: string | URL) {
  let url: URL

  try {
    url = new URL(input.toString().trim())
  } catch {
    throw new ProductUrlError("Enter a valid product URL")
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ProductUrlError("Product URLs must use HTTP or HTTPS")
  }

  if (url.username || url.password) {
    throw new ProductUrlError("Product URLs cannot contain credentials")
  }

  if (url.port) {
    throw new ProductUrlError("Product URLs cannot use a custom port")
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, "")

  if (!hostname.includes(".") || isIpAddress(hostname) || isBlockedDomain(hostname)) {
    throw new ProductUrlError("Product URLs must use a public domain")
  }

  url.hostname = hostname
  url.hash = ""

  return url
}

export type ProductFetcher = (url: string, init: RequestInit) => Promise<Response>

interface ProductPage {
  response: Response
  url: URL
}

export async function fetchPublicResource(
  input: string | URL,
  accept: string,
  fetcher: ProductFetcher = fetch,
): Promise<ProductPage> {
  let url = validateProductUrl(input)

  for (let redirectCount = 0; ; redirectCount += 1) {
    const response = await fetcher(url.href, {
      headers: { accept },
      redirect: "manual",
    })

    if (!redirectStatuses.has(response.status)) {
      return { response, url }
    }

    const location = response.headers.get("location")
    await response.body?.cancel()

    if (!location) {
      throw new ProductUrlError("Product page returned an invalid redirect")
    }

    if (redirectCount >= maxRedirects) {
      throw new ProductUrlError("Product page redirected too many times")
    }

    url = validateProductUrl(new URL(location, url))
  }
}

export function fetchProductPage(
  input: string | URL,
  fetcher: ProductFetcher = fetch,
) {
  return fetchPublicResource(input, "text/html,application/xhtml+xml", fetcher)
}
