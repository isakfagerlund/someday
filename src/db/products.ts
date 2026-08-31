import { and, desc, eq } from "drizzle-orm"

import type {
  CatalogProduct,
  Category,
  NewProduct,
  ProductUpdates,
} from "../domain/product"
import { createDb } from "./index"
import { products } from "./schema"

const catalogProductColumns = {
  id: products.id,
  sourceUrl: products.sourceUrl,
  name: products.name,
  brand: products.brand,
  category: products.category,
  originalImageUrl: products.originalImageUrl,
  processedImageKey: products.processedImageKey,
  backgroundRemoved: products.backgroundRemoved,
  subjectScale: products.subjectScale,
  subjectPosition: products.subjectPosition,
}

export async function listProducts(
  database: D1Database,
  boardId: string,
  category: Category | null,
): Promise<CatalogProduct[]> {
  const filters = [
    eq(products.boardId, boardId),
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
  boardId: string,
  canonicalUrl: string,
) {
  const product = await createDb(database)
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.boardId, boardId),
        eq(products.canonicalUrl, canonicalUrl),
      ),
    )
    .get()

  return Boolean(product)
}

export async function insertProduct(
  database: D1Database,
  boardId: string,
  product: NewProduct,
): Promise<CatalogProduct> {
  const created = await createDb(database)
    .insert(products)
    .values({
      ...product,
      boardId,
    })
    .returning(catalogProductColumns)
    .get()

  if (!created) throw new Error("D1 did not return the created product")

  return created
}

export async function updateProduct(
  database: D1Database,
  id: string,
  boardId: string,
  updates: ProductUpdates,
): Promise<CatalogProduct | undefined> {
  return createDb(database)
    .update(products)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.boardId, boardId)))
    .returning(catalogProductColumns)
    .get()
}

export async function deleteProduct(
  database: D1Database,
  id: string,
  boardId: string,
) {
  return createDb(database)
    .delete(products)
    .where(and(eq(products.id, id), eq(products.boardId, boardId)))
    .returning({ processedImageKey: products.processedImageKey })
    .get()
}
