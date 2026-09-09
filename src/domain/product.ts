export const categories = ["Clothing", "Accessories", "Tech", "Home", "Other"] as const

export type Category = (typeof categories)[number]

export const productStatuses = ["wishlist", "owned", "archived"] as const
export type ProductStatus = (typeof productStatuses)[number]
export type ProductView = "owned" | undefined

export function statusView(status: ProductStatus): ProductView {
  return status === "owned" ? "owned" : undefined
}

export interface SubjectPosition {
  x: number
  y: number
}

export interface CatalogProduct {
  id: string
  sourceUrl: string
  name: string
  brand: string
  category: Category
  status: ProductStatus
  ownedAt: Date | null
  originalImageUrl: string
  processedImageKey: string
  backgroundRemoved: boolean
  subjectScale: number
  subjectPosition: SubjectPosition
}

export interface NewProduct extends Omit<CatalogProduct, "status" | "ownedAt"> {
  canonicalUrl: string
  importEvidence: unknown
}

export interface ProductUpdates {
  name?: string
  brand?: string
  category?: Category
}

export function isCategory(value: string | null): value is Category {
  return categories.some((category) => category === value)
}
