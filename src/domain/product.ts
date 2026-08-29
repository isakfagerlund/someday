export const categories = ["Clothing", "Accessories", "Tech", "Other"] as const

export type Category = (typeof categories)[number]

export interface CatalogProduct {
  id: string
  sourceUrl: string
  name: string
  brand: string
  category: Category
  imageKey: string
}

export interface NewProduct extends CatalogProduct {
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
