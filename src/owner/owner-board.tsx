import { ClerkProvider } from "@clerk/tanstack-react-start"

import { BoardLayout } from "../components/board-layout"
import { ProductGrid } from "../components/product-grid"
import type { Board } from "../db/boards"
import type { CatalogProduct, Category } from "../domain/product"
import { EditProductButton } from "./edit-product-dialog"
import { AddProductButton } from "./import-product-dialog"

interface OwnerBoardProps {
  board: Board
  category: Category | null
  clerkPublishableKey: string
  products: CatalogProduct[]
}

// The owner's version of the board: same public markup plus the controls.
export default function OwnerBoard({
  board,
  category,
  clerkPublishableKey,
  products,
}: OwnerBoardProps) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <BoardLayout board={board} category={category} action={<AddProductButton />}>
        <ProductGrid
          products={products}
          renderActions={(product) => <EditProductButton product={product} />}
        />
      </BoardLayout>
    </ClerkProvider>
  )
}
