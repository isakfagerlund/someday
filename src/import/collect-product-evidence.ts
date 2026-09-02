import { fetchPlatformEvidence } from "./platform-product"
import {
  extractProductEvidence,
  ProductEvidenceError,
  type ProductEvidence,
} from "./product-evidence"
import {
  fetchProductPage,
  type ProductFetcher,
  type ProductPage,
  validateProductUrl,
} from "./product-url"

export interface ProductBrowser {
  quickAction(
    action: "content",
    options: BrowserRunContentOptions,
  ): Promise<Response>
}

export interface CollectedProductEvidence {
  evidence: ProductEvidence
  method: "direct" | "platform" | "rendered"
}

export class BrowserEvidenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BrowserEvidenceError"
  }
}

function containsProductJsonLd(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsProductJsonLd)
  if (!value || typeof value !== "object") return false

  const record = value as Record<string, unknown>
  const types = Array.isArray(record["@type"])
    ? record["@type"]
    : [record["@type"]]

  return (
    types.includes("Product") ||
    (Array.isArray(record["@graph"]) &&
      record["@graph"].some(containsProductJsonLd))
  )
}

export function needsRenderedFallback(evidence: ProductEvidence) {
  const hasName = Boolean(
    evidence.metadata["og:title"] ||
      evidence.metadata["twitter:title"] ||
      evidence.title ||
      evidence.jsonLd.some(containsProductJsonLd),
  )

  return !hasName || evidence.images.length === 0
}

async function extractRenderedEvidence(browser: ProductBrowser, pageUrl: URL) {
  const response = await browser.quickAction("content", {
    url: pageUrl.href,
    bestAttempt: true,
    gotoOptions: {
      waitUntil: "networkidle2",
      timeout: 15_000,
    },
    rejectResourceTypes: ["image", "media", "font", "stylesheet"],
  })

  let result: BrowserRunContentSuccessResponse | BrowserRunErrorResponse

  try {
    result = await response.json<
      BrowserRunContentSuccessResponse | BrowserRunErrorResponse
    >()
  } catch {
    throw new BrowserEvidenceError("Browser Run returned invalid JSON")
  }

  if (!response.ok || !result.success) {
    const message = result.success
      ? `Browser Run returned HTTP ${response.status}`
      : (result.errors[0]?.message ?? "Browser Run could not render the product page")

    throw new BrowserEvidenceError(message)
  }

  if (result.meta.status < 200 || result.meta.status >= 300) {
    throw new BrowserEvidenceError(
      `Rendered product page returned HTTP ${result.meta.status}`,
    )
  }

  let renderedUrl = pageUrl

  if (result.meta.finalUrl) {
    try {
      renderedUrl = validateProductUrl(result.meta.finalUrl)
    } catch {
      throw new BrowserEvidenceError("Browser Run ended at an unsafe URL")
    }
  }

  return extractProductEvidence(
    new Response(result.result, {
      headers: { "content-type": "text/html; charset=utf-8" },
    }),
    renderedUrl,
  )
}

/**
 * Session-gated shops (WooCommerce behind Cloudflare, for example) answer 403
 * until the visitor carries the cookies handed out on the site root.
 */
async function sessionCookie(pageUrl: URL, fetcher: ProductFetcher) {
  const root = await fetchProductPage(new URL("/", pageUrl), fetcher)
  await root.response.body?.cancel()

  return root.response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ")
}

async function extractDirectEvidence(page: ProductPage) {
  try {
    return await extractProductEvidence(page.response, page.url)
  } catch (error) {
    if (!(error instanceof ProductEvidenceError)) throw error
    return null
  }
}

export async function collectProductEvidence(
  input: string | URL,
  browser: ProductBrowser,
  fetcher: ProductFetcher = fetch,
): Promise<CollectedProductEvidence> {
  let page = await fetchProductPage(input, fetcher)

  if (page.response.status === 403) {
    const cookie = await sessionCookie(page.url, fetcher)

    if (cookie) {
      await page.response.body?.cancel()
      page = await fetchProductPage(page.url, fetcher, cookie)
    }
  }

  const blockedStatus = page.response.ok ? null : page.response.status
  const directEvidence = await extractDirectEvidence(page)

  if (directEvidence && !needsRenderedFallback(directEvidence)) {
    return { evidence: directEvidence, method: "direct" }
  }

  const platformEvidence = await fetchPlatformEvidence(page.url, fetcher)

  if (platformEvidence) {
    return { evidence: platformEvidence, method: "platform" }
  }

  // Bot managers that reject a plain fetch reject Browser Run too, so rendering
  // only helps pages that loaded but build their content client-side.
  if (blockedStatus) {
    throw new ProductEvidenceError(
      `Product page returned HTTP ${blockedStatus}`,
    )
  }

  return {
    evidence: await extractRenderedEvidence(browser, page.url),
    method: "rendered",
  }
}
