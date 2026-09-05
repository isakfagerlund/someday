import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Dialog } from "@base-ui/react/dialog"
import { Select } from "@base-ui/react/select"
import { useState } from "react"

import { EditIcon } from "../components/icons"
import { categories, type CatalogProduct, type Category } from "../domain/product"
import { deleteProduct, updateProduct } from "../server/products"
import {
  backdropClass,
  dangerButtonClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  inputClass,
  labelClass,
  popupClass,
  primaryButtonClass,
} from "./ui"

export function EditProductButton({ product }: { product: CatalogProduct }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        className="pressable focus-ring absolute top-3 right-3 grid size-11 cursor-pointer place-items-center rounded-pill border-0 bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-0 text-text shadow-surface hover:scale-[1.04] [@media(hover:hover)_and_(pointer:fine)]:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100"
        aria-label={`Edit ${product.name}`}
      >
        <EditIcon className="size-[1.2rem] fill-current" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={`${popupClass} w-[min(100%-2rem,30rem)]`}>
          {open && <EditProductForm product={product} />}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function EditProductForm({ product }: { product: CatalogProduct }) {
  const [category, setCategory] = useState<Category>(product.category)
  const [error, setError] = useState<string | null>(null)

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const form = new FormData(event.currentTarget)

    try {
      await updateProduct({
        data: {
          id: product.id,
          name: String(form.get("name")),
          brand: String(form.get("brand")),
          category,
        },
      })
      location.reload()
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be saved."))
    }
  }

  async function remove() {
    setError(null)

    try {
      await deleteProduct({ data: { id: product.id } })
      location.reload()
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be deleted."))
    }
  }

  return (
    <form className="flex flex-col gap-2 p-6" onSubmit={save}>
      <DialogHeading className="mb-4" closeLabel="Close edit product dialog">
        Edit product
      </DialogHeading>
      <label className={labelClass} htmlFor="edit-product-name">
        Name
      </label>
      <input
        className={inputClass}
        id="edit-product-name"
        name="name"
        defaultValue={product.name}
        required
      />
      <label className={labelClass} htmlFor="edit-product-brand">
        Brand
      </label>
      <input
        className={inputClass}
        id="edit-product-brand"
        name="brand"
        defaultValue={product.brand}
        required
      />
      <label className={labelClass} id="edit-product-category-label">
        Category
      </label>
      <CategorySelect value={category} onChange={setCategory} />
      <ErrorMessage message={error} />
      <div className="mt-6 flex items-center justify-between gap-3">
        <DeleteProductButton onConfirm={remove} />
        <button className={primaryButtonClass} type="submit">
          Save
        </button>
      </div>
    </form>
  )
}

function CategorySelect({
  value,
  onChange,
}: {
  value: Category
  onChange: (category: Category) => void
}) {
  return (
    <Select.Root
      value={value}
      onValueChange={(next) => next && onChange(next)}
      items={categories.map((category) => ({ label: category, value: category }))}
    >
      <Select.Trigger
        className={`${inputClass} flex cursor-pointer items-center justify-between text-left`}
        aria-labelledby="edit-product-category-label"
      >
        <Select.Value />
        <Select.Icon aria-hidden="true">▾</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="z-10 outline-none" sideOffset={4}>
          <Select.Popup className="min-w-(--anchor-width) rounded-lg border border-border bg-surface py-1 text-text shadow-surface-hover">
            <Select.List>
              {categories.map((category) => (
                <Select.Item
                  className="cursor-default px-3 py-2 outline-none data-[highlighted]:bg-bg"
                  key={category}
                  value={category}
                >
                  <Select.ItemText>{category}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

function DeleteProductButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className={dangerButtonClass}>
        Delete
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdropClass} />
        <AlertDialog.Popup
          className={`${popupClass} flex w-[min(100%-2rem,24rem)] flex-col gap-2 p-6`}
        >
          <AlertDialog.Title render={<h2 />}>Delete this product?</AlertDialog.Title>
          <AlertDialog.Description className="text-muted">
            It is removed from the board right away.
          </AlertDialog.Description>
          <div className="mt-6 flex items-center justify-end gap-3">
            <AlertDialog.Close className={dangerButtonClass}>
              Cancel
            </AlertDialog.Close>
            <AlertDialog.Close className={primaryButtonClass} onClick={onConfirm}>
              Delete
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
