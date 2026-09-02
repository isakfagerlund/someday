import { z } from "zod"

import { purgeBoardCache } from "../catalog-cache"
import { getBoardByOwnerId, getProductBoard } from "../db/boards"
import { deleteProduct, updateProduct } from "../db/products"
import { categories } from "../domain/product"
import { deleteProductImage } from "../images"
import {
  createProduct,
  DuplicateProductError,
  previewProduct,
  ProductImageImportError,
} from "../import/import-product"
import { ProductUrlError } from "../import/product-url"

const previewProductInputSchema = z
  .object({ url: z.string().trim().min(1) })
  .strict()

const createProductInputSchema = z
  .object({
    sourceUrl: z.string().trim().min(1),
    canonicalUrl: z.string().trim().min(1),
    name: z.string().trim().min(1).max(300),
    brand: z.string().trim().min(1).max(150),
    category: z.enum(categories),
    imageUrl: z.string().trim().min(1),
    method: z.enum(["direct", "fallback", "platform", "rendered", "search"]),
  })
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

async function parseJsonInput<T>(request: Request, schema: z.ZodType<T>) {
  const contentLength = Number(request.headers.get("content-length"))

  if (Number.isFinite(contentLength) && contentLength > 32_000) return null

  let body: unknown
  try {
    body = await request.json<unknown>()
  } catch {
    return null
  }

  const result = schema.safeParse(body)
  return result.success ? result.data : null
}

export async function handlePreviewProduct(
  request: Request,
  userId: string,
  env: Env,
) {
  const input = await parseJsonInput(request, previewProductInputSchema)

  if (!input) {
    return jsonError('Send JSON like {"url":"https://shop.example/product"}', 400)
  }

  const board = await getBoardByOwnerId(env.DB, userId)
  if (!board) return jsonError("You do not own a board", 403)

  try {
    const preview = await previewProduct(input.url, env)
    return Response.json(preview, { headers: { "cache-control": "no-store" } })
  } catch (error) {
    if (error instanceof ProductUrlError) return jsonError(error.message, 400)
    throw error
  }
}

export async function handleCreateProduct(
  request: Request,
  userId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  const input = await parseJsonInput(request, createProductInputSchema)

  if (!input) {
    return jsonError("Confirm the product details and choose an image.", 400)
  }

  const board = await getBoardByOwnerId(env.DB, userId)

  if (!board) return jsonError("You do not own a board", 403)

  try {
    const product = await createProduct(input, board.id, env)
    await purgeBoardCache(ctx, board.id)

    return Response.json(product, {
      status: 201,
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    if (error instanceof ProductUrlError) {
      return jsonError(error.message, 400)
    }

    if (error instanceof DuplicateProductError) {
      return jsonError(error.message, 409)
    }

    if (error instanceof ProductImageImportError) {
      return jsonError(error.message, 422)
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
