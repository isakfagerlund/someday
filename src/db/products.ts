import { and, desc, eq, or, sql } from "drizzle-orm"

import type {
  CatalogProduct,
  NewProduct,
  ProductUpdates,
  ProductStatus,
} from "../domain/product"
import { createDb } from "./index"
import { boards, products } from "./schema"

const catalogProductColumns = {
  id: products.id,
  sourceUrl: products.sourceUrl,
  name: products.name,
  brand: products.brand,
  category: products.category,
  status: products.status,
  ownedAt: products.ownedAt,
  originalImageUrl: products.originalImageUrl,
  processedImageKey: products.processedImageKey,
  backgroundRemoved: products.backgroundRemoved,
  subjectScale: products.subjectScale,
  subjectPosition: products.subjectPosition,
}

export async function listProducts(
  database: D1Database,
  boardId: string,
  viewerId: string | null = null,
): Promise<CatalogProduct[]> {
  return createDb(database)
    .select(catalogProductColumns)
    .from(products)
    .innerJoin(boards, eq(products.boardId, boards.id))
    .where(and(
      eq(products.boardId, boardId),
      or(
        eq(products.status, "wishlist"),
        viewerId ? eq(boards.clerkOwnerId, viewerId) : undefined,
      ),
    ))
    .orderBy(desc(products.createdAt))
    .all()
}

export async function getProductByUrl(
  database: D1Database,
  boardId: string,
  canonicalUrl: string,
) {
  return createDb(database)
    .select(catalogProductColumns)
    .from(products)
    .where(
      and(
        eq(products.boardId, boardId),
        eq(products.canonicalUrl, canonicalUrl),
      ),
    )
    .get()
}

export async function setProductStatus(
  database: D1Database,
  id: string,
  boardId: string,
  status: ProductStatus,
) {
  const now = new Date()
  return createDb(database)
    .update(products)
    .set({
      status,
      ownedAt: status === "owned"
        ? sql`coalesce(${products.ownedAt}, ${now.getTime()})`
        : null,
      updatedAt: now,
    })
    .where(and(eq(products.id, id), eq(products.boardId, boardId)))
    .returning(catalogProductColumns)
    .get()
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
