import { handleCreateBoard } from "./api/boards"
import {
  handleCreateProduct,
  handleDeleteProduct,
  handleUpdateProduct,
} from "./api/products"
import {
  addAuthHeaders,
  authenticateRequest,
  getUserDisplayName,
} from "./auth"
import {
  boardCacheHeaders,
  homeCacheHeaders,
  privateHtmlCacheHeaders,
} from "./catalog-cache"
import { getBoardByOwnerId, getBoardBySlug, listBoards } from "./db/boards"
import { listProducts } from "./db/products"
import { reservedBoardSlugs } from "./domain/board"
import { isCategory } from "./domain/product"
import { serveProductImage } from "./images"
import { renderCatalogPage } from "./ui/catalog-page"
import { catalogScript } from "./ui/catalog-script"
import { apiClientScript } from "./ui/api-client-script"
import { homeScript } from "./ui/home-script"
import { renderHomePage } from "./ui/home-page"

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "cache-control": "no-store" } },
  )
}

function getBoardSlug(pathname: string) {
  const match = pathname.match(/^\/([^/]+)\/?$/)

  if (!match?.[1]) return null

  let slug: string

  try {
    slug = decodeURIComponent(match[1])
  } catch {
    return null
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  if (reservedBoardSlugs.has(slug)) return null

  return slug
}

async function handleMutation(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  productId?: string,
) {
  const auth = await authenticateRequest(request, env)

  if (auth.response) return auth.response

  const { headers, userId } = auth.request

  if (!userId) return addAuthHeaders(jsonError("Unauthorized", 401), headers)

  let response: Response

  if (request.method === "POST") {
    response = await handleCreateProduct(request, userId, env, ctx)
  } else if (request.method === "PATCH" && productId) {
    response = await handleUpdateProduct(request, productId, userId, env, ctx)
  } else if (request.method === "DELETE" && productId) {
    response = await handleDeleteProduct(productId, userId, env, ctx)
  } else {
    response = new Response("Not found", { status: 404 })
  }

  return addAuthHeaders(response, headers)
}

async function handleHtmlRequest(request: Request, env: Env) {
  const url = new URL(request.url)
  const auth = await authenticateRequest(request, env)

  if (auth.response) return auth.response

  const { headers: authHeaders, signInUrl, userId } = auth.request
  const cacheHeaders = userId ? privateHtmlCacheHeaders : homeCacheHeaders

  if (url.pathname === "/auth/redirect") {
    const board = userId
      ? await getBoardByOwnerId(env.DB, userId)
      : undefined
    const location = board ? `/${encodeURIComponent(board.slug)}` : "/"

    return addAuthHeaders(
      new Response(null, {
        status: 303,
        headers: { "cache-control": "private, no-store", location },
      }),
      authHeaders,
    )
  }

  if (url.pathname === "/") {
    const boards = await listBoards(env.DB)
    const ownerBoard = userId
      ? boards.find((board) => board.clerkOwnerId === userId)
      : undefined
    const userName = userId
      ? await getUserDisplayName(userId, env).catch(() => "Signed in")
      : null
    const html = renderHomePage({
      boardStatus: url.searchParams.get("board"),
      boards,
      clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
      ownerBoard,
      signInUrl,
      userName,
    })

    return addAuthHeaders(
      new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          ...cacheHeaders,
        },
      }),
      authHeaders,
    )
  }

  const slug = getBoardSlug(url.pathname)

  if (!slug) {
    return addAuthHeaders(
      new Response("Not found", { status: 404, headers: cacheHeaders }),
      authHeaders,
    )
  }

  const board = await getBoardBySlug(env.DB, slug)

  if (!board) {
    return addAuthHeaders(
      new Response("Not found", { status: 404, headers: cacheHeaders }),
      authHeaders,
    )
  }

  const requestedCategory = url.searchParams.get("category")
  const activeCategory = isCategory(requestedCategory)
    ? requestedCategory
    : null
  const canManage = board.clerkOwnerId === userId
  const products = await listProducts(env.DB, board.id, activeCategory)
  const html = renderCatalogPage({
    activeCategory,
    board,
    canManage,
    clerkPublishableKey: env.CLERK_PUBLISHABLE_KEY,
    importStatus: canManage ? url.searchParams.get("import") : null,
    products,
  })

  return addAuthHeaders(
    new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        ...(userId ? privateHtmlCacheHeaders : boardCacheHeaders(board.id)),
      },
    }),
    authHeaders,
  )
}

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

  if (url.pathname === "/api-client.js" && request.method === "GET") {
    return new Response(apiClientScript, {
      headers: {
        "cache-control": "public, max-age=0, must-revalidate",
        "content-type": "text/javascript; charset=utf-8",
      },
    })
  }

  if (url.pathname === "/home.js" && request.method === "GET") {
    return new Response(homeScript, {
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
    return handleMutation(request, env, ctx)
  }

  if (url.pathname === "/api/boards" && request.method === "POST") {
    const auth = await authenticateRequest(request, env)

    if (auth.response) return auth.response

    const { headers, userId } = auth.request
    const response = userId
      ? await handleCreateBoard(request, userId, env, ctx)
      : jsonError("Unauthorized", 401)

    return addAuthHeaders(response, headers)
  }

  const productRoute = url.pathname.match(/^\/api\/products\/([^/]+)$/)

  if (
    productRoute &&
    (request.method === "PATCH" || request.method === "DELETE")
  ) {
    return handleMutation(request, env, ctx, productRoute[1] ?? "")
  }

  if (request.method === "GET") return handleHtmlRequest(request, env)

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
        return jsonError("Internal server error", 500)
      }

      return new Response("Internal server error", { status: 500 })
    }
  },
} satisfies ExportedHandler<Env>
