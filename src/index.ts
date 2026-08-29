import {
  handleCreateProduct,
  handleDeleteProduct,
  handleUpdateProduct,
} from "./api/products"
import { catalogCacheHeaders } from "./catalog-cache"
import { listProducts } from "./db/products"
import { isCategory } from "./domain/product"
import { serveProductImage } from "./images"
import { renderCatalogPage } from "./ui/catalog-page"
import { catalogScript } from "./ui/catalog-script"

async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === "/health") {
    return Response.json(
      { status: "ok" },
      { headers: { "cache-control": "no-store" } },
    )
  }

  if (url.pathname === "/catalog.js" && request.method === "GET") {
    return new Response(catalogScript, {
      headers: {
        "cache-control": "public, max-age=0, must-revalidate",
        "content-type": "text/javascript; charset=utf-8",
      },
    })
  }

  if (
    url.pathname.startsWith("/images/") &&
    (request.method === "GET" || request.method === "HEAD")
  ) {
    return serveProductImage(request, env.IMAGE_BUCKET)
  }

  if (url.pathname === "/api/products" && request.method === "POST") {
    return handleCreateProduct(request, env, ctx)
  }

  const productRoute = url.pathname.match(/^\/api\/products\/([^/]+)$/)

  if (productRoute && request.method === "PATCH") {
    const productId = productRoute[1] ?? ""
    return handleUpdateProduct(request, productId, env, ctx)
  }

  if (productRoute && request.method === "DELETE") {
    const productId = productRoute[1] ?? ""
    return handleDeleteProduct(productId, env, ctx)
  }

  if (url.pathname === "/" && request.method === "GET") {
    const requestedCategory = url.searchParams.get("category")
    const importStatus = url.searchParams.get("import")
    const activeCategory = isCategory(requestedCategory)
      ? requestedCategory
      : null
    const products = await listProducts(env.DB, activeCategory)

    return new Response(renderCatalogPage({ activeCategory, importStatus, products }), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        ...(importStatus
          ? { "cache-control": "no-store" }
          : catalogCacheHeaders),
      },
    })
  }

  return new Response("Not found", { status: 404 })
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    try {
      return await handleRequest(request, env, ctx)
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "request failed",
          method: request.method,
          path: new URL(request.url).pathname,
          error: error instanceof Error ? error.message : String(error),
        }),
      )

      if (new URL(request.url).pathname.startsWith("/api/")) {
        return Response.json(
          { error: "Internal server error" },
          { status: 500, headers: { "cache-control": "no-store" } },
        )
      }

      return new Response("Internal server error", { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
