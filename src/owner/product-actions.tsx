import { Menu } from "@base-ui/react/menu"
import { useRef, useState } from "react"

import { DotsThreeIcon } from "../components/icons"
import type { CatalogProduct, ProductStatus } from "../domain/product"
import { EditProductDialog } from "./edit-product-dialog"

const itemClass = "flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-[highlighted]:bg-bg data-[disabled]:cursor-wait data-[disabled]:opacity-50"

export function ProductActions({ product, disabled, onStatusChange }: {
  product: CatalogProduct
  disabled: boolean
  onStatusChange: (product: CatalogProduct, status: ProductStatus) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      <Menu.Root>
        <Menu.Trigger
          ref={triggerRef}
          id={`product-actions-${product.id}`}
          aria-busy={disabled || undefined}
          className="pressable focus-ring absolute top-3 left-3 grid size-11 cursor-pointer place-items-center rounded-pill border-0 bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-0 text-text shadow-surface disabled:cursor-wait data-[popup-open]:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
          aria-label={`Actions for ${product.name}`}
        >
          <DotsThreeIcon className="size-5 fill-current" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={6} align="start" className="z-10 outline-none">
            <Menu.Popup finalFocus={() => editing ? false : triggerRef.current} className="min-w-56 rounded-xl border border-border bg-surface p-1 text-text shadow-surface-hover outline-none">
              {product.status !== "owned" && <Menu.Item className={itemClass} disabled={disabled} onClick={() => void onStatusChange(product, "owned")}>Mark as owned</Menu.Item>}
              {product.status !== "wishlist" && <Menu.Item className={itemClass} disabled={disabled} onClick={() => void onStatusChange(product, "wishlist")}>Move to wishlist</Menu.Item>}
              <Menu.Separator className="mx-2 my-1 h-px bg-border" />
              <Menu.Item className={itemClass} disabled={disabled} onClick={() => setEditing(true)}>Edit product</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <EditProductDialog product={product} open={editing} onOpenChange={setEditing} triggerRef={triggerRef} />
    </>
  )
}
