import { z } from "zod"

import { purgeCatalogCache } from "../catalog-cache"
import { deleteProduct, updateProduct } from "../db/products"
import { categories } from "../domain/product"
import { deleteProductImage } from "../images"
import {
  DuplicateProductError,
  importProduct,
  ProductImportError,
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
    {
      status,
      headers: { "cache-control": "no-store" },
    },
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

function redirectToCatalog(request: Request, importStatus?: string) {
  const location = new URL("/", request.url)

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
  env: Env,
  ctx: ExecutionContext,
) {
  const { acceptsHtml, input } = await parseCreateProductInput(request)

  if (!input) {
    if (acceptsHtml) return redirectToCatalog(request, "invalid")

    return jsonError('Send JSON like {"url":"https://shop.example/product"}', 400)
  }

  try {
    const product = await importProduct(input.url, env)
    await purgeCatalogCache(ctx)

    if (acceptsHtml) return redirectToCatalog(request)

    return Response.json(product, {
      status: 201,
      headers: { "cache-control": "no-store" },
    })
  } catch (error) {
    if (error instanceof ProductUrlError) {
      if (acceptsHtml) return redirectToCatalog(request, "invalid")

      return jsonError(error.message, 400)
    }

    if (error instanceof DuplicateProductError) {
      if (acceptsHtml) return redirectToCatalog(request, "duplicate")

      return jsonError(error.message, 409)
    }

    if (error instanceof ProductImportError) {
      if (acceptsHtml) return redirectToCatalog(request, "failed")

      return jsonError(error.message, 422)
    }

    throw error
  }
}

export async function handleDeleteProduct(
  productId: string,
  env: Env,
  ctx: ExecutionContext,
) {
  if (!z.uuid().safeParse(productId).success) {
    return jsonError("Product not found", 404)
  }

  const deleted = await deleteProduct(env.DB, productId)

  if (!deleted) return jsonError("Product not found", 404)

  try {
    await deleteProductImage(env.IMAGE_BUCKET, deleted.imageKey)
  } catch (error) {
    console.error(
      JSON.stringify({
        message: "failed to delete product image",
        productId,
        imageKey: deleted.imageKey,
        error: error instanceof Error ? error.message : String(error),
      }),
    )
  }

  await purgeCatalogCache(ctx)

  return new Response(null, {
    status: 204,
    headers: { "cache-control": "no-store" },
  })
}

export async function handleUpdateProduct(
  request: Request,
  productId: string,
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

  const product = await updateProduct(env.DB, productId, input.data)

  if (!product) return jsonError("Product not found", 404)

  await purgeCatalogCache(ctx)

  return Response.json(product, {
    headers: { "cache-control": "no-store" },
  })
}
