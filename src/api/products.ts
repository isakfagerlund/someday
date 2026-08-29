import { z } from "zod"

import { purgeBoardCache } from "../catalog-cache"
import { getBoardByOwnerId, getProductBoard } from "../db/boards"
import { deleteProduct, updateProduct } from "../db/products"
import { categories } from "../domain/product"
import { deleteProductImage } from "../images"
import {
  DuplicateProductError,
  importProduct,
} from "../import/import-product"
import { ProductUrlError } from "../import/product-url"

const createProductInputSchema = z
  .object({ url: z.string().trim().min(1) })
  .strict()

const updateProductInputSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    brand: z.string().trim().min(1).optional(),
    category: z.enum(categories).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0)

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    { status, headers: { "cache-control": "no-store" } },
  )
}

async function parseCreateProductInput(request: Request) {
  let body: unknown
  const contentType = request.headers.get("content-type") ?? ""
  const acceptsHtml = contentType.startsWith(
    "application/x-www-form-urlencoded",
  )

  try {
    if (acceptsHtml) {
      const form = await request.formData()
      body = { url: form.get("url") }
    } else {
      body = await request.json<unknown>()
    }
  } catch {
    return { acceptsHtml, input: null }
  }

  const result = createProductInputSchema.safeParse(body)
  return { acceptsHtml, input: result.success ? result.data : null }
}

function redirectToBoard(
  request: Request,
  boardSlug: string,
  importStatus?: string,
) {
  const location = new URL(`/${encodeURIComponent(boardSlug)}`, request.url)

  if (importStatus) location.searchParams.set("import", importStatus)

  return new Response(null, {
    status: 303,
    headers: {
      "cache-control": "no-store",
      location: location.href,
    },
  })
}

export async function handleCreateProduct(
  request: Request,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const { acceptsHtml, input } = await parseCreateProductInput(request)

  if (!input && !acceptsHtml) {
    return jsonError('Send JSON like {"url":"https://shop.example/product"}', 400)
  }

  const board = await getBoardByOwnerId(env.DB, userId)

  if (!board) return jsonError("You do not own a board", 403)
  if (!input) return redirectToBoard(request, board.slug, "invalid")

  try {
    const product = await importProduct(input.url, board.id, env)
    await purgeBoardCache(ctx, board.id)

    if (acceptsHtml) return redirectToBoard(request, board.slug)

    return Response.json(product, {
      status: 201,
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    if (error instanceof ProductUrlError) {
      if (acceptsHtml) {
        return redirectToBoard(request, board.slug, "invalid")
      }

      return jsonError(error.message, 400)
    }

    if (error instanceof DuplicateProductError) {
      if (acceptsHtml) {
        return redirectToBoard(request, board.slug, "duplicate")
      }

      return jsonError(error.message, 409)
    }

    throw error
  }
}

export async function handleDeleteProduct(
  productId: string,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  if (!z.uuid().safeParse(productId).success) {
    return jsonError("Product not found", 404)
  }

  const productBoard = await getProductBoard(env.DB, productId)

  if (!productBoard) return jsonError("Product not found", 404)
  if (productBoard.clerkOwnerId !== userId) {
    return jsonError("You do not own this board", 403)
  }

  const deleted = await deleteProduct(env.DB, productId, productBoard.boardId)

  if (!deleted) return jsonError("Product not found", 404)

  if (deleted.processedImageKey) {
    try {
      await deleteProductImage(env.IMAGE_BUCKET, deleted.processedImageKey)
    } catch (error) {
      console.error(
        JSON.stringify({
          message: "failed to delete product image",
          productId,
          processedImageKey: deleted.processedImageKey,
          error: error instanceof Error ? error.message : String(error),
        }),
      )
    }
  }

  await purgeBoardCache(ctx, productBoard.boardId)

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  })
}

export async function handleUpdateProduct(
  request: Request,
  productId: string,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  if (!z.uuid().safeParse(productId).success) {
    return jsonError("Product not found", 404)
  }

  let body: unknown

  try {
    body = await request.json<unknown>()
  } catch {
    return jsonError("Send name, brand, or category as JSON", 400)
  }

  const input = updateProductInputSchema.safeParse(body)

  if (!input.success) {
    return jsonError("Send name, brand, or category as JSON", 400)
  }

  const productBoard = await getProductBoard(env.DB, productId)

  if (!productBoard) return jsonError("Product not found", 404)
  if (productBoard.clerkOwnerId !== userId) {
    return jsonError("You do not own this board", 403)
  }

  const product = await updateProduct(
    env.DB,
    productId,
    productBoard.boardId,
    input.data,
  )

  if (!product) return jsonError("Product not found", 404)

  await purgeBoardCache(ctx, productBoard.boardId)

  return Response.json(product, {
    headers: { "cache-control": "no-store" },
  })
}
