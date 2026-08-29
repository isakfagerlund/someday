import { and, desc, eq } from "drizzle-orm"

import type {
  CatalogProduct,
  Category,
  NewProduct,
  ProductUpdates,
} from "../domain/product"
import { createDb } from "./index"
import { defaultBoardId, products } from "./schema"

const catalogProductColumns = {
  id: products.id,
  sourceUrl: products.sourceUrl,
  name: products.name,
  brand: products.brand,
  category: products.category,
  imageKey: products.imageKey,
}

export async function listProducts(
  database: D1Database,
  category: Category | null,
): Promise<CatalogProduct[]> {
  const filters = [
    eq(products.boardId, defaultBoardId),
    category ? eq(products.category, category) : undefined,
  ]

  return createDb(database)
    .select(catalogProductColumns)
    .from(products)
    .where(and(...filters))
    .orderBy(desc(products.createdAt))
    .all()
}

export async function productExists(
  database: D1Database,
  canonicalUrl: string,
) {
  const product = await createDb(database)
    .select({ id: products.id })
    .from(products)
    .where(eq(products.canonicalUrl, canonicalUrl))
    .get()

  return Boolean(product)
}

export async function insertProduct(
  database: D1Database,
  product: NewProduct,
): Promise<CatalogProduct> {
  const created = await createDb(database)
    .insert(products)
    .values({
      ...product,
      boardId: defaultBoardId,
    })
    .returning(catalogProductColumns)
    .get()

  if (!created) throw new Error("D1 did not return the created product")

  return created
}

export async function updateProduct(
  database: D1Database,
  id: string,
  updates: ProductUpdates,
): Promise<CatalogProduct | undefined> {
  return createDb(database)
    .update(products)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.boardId, defaultBoardId)))
    .returning(catalogProductColumns)
    .get()
}

export async function deleteProduct(database: D1Database, id: string) {
  return createDb(database)
    .delete(products)
    .where(and(eq(products.id, id), eq(products.boardId, defaultBoardId)))
    .returning({ imageKey: products.imageKey })
    .get()
}
