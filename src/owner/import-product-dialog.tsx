import { Dialog } from "@base-ui/react/dialog"
import { ScrollArea } from "@base-ui/react/scroll-area"
import { useEffect, useRef, useState } from "react"

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  UploadIcon,
} from "../components/icons"
import type { CatalogProduct } from "../domain/product"
import type { ProductImportPreview } from "../import/import-product"
import {
  createProduct,
  maxUploadBytes,
  previewProduct,
  setProductStatus,
} from "../server/products"
import {
  compressProductImage,
  compressRemoteProductImage,
} from "./compress-product-image"
import { MorphDialog } from "./morph-dialog"
import { SaveSetup } from "./save-setup"
import {
  backdropClass,
  DialogHeading,
  ErrorMessage,
  errorMessage,
  primaryButtonClass,
} from "./ui"

const urlInputClass =
  "focus-ring h-11 min-w-0 flex-1 rounded-pill border border-border bg-surface px-4 text-text"

export function AddProductButton({
  boardId,
  initialUrl = "",
  onAdded,
  onExisting,
}: {
  boardId: string
  initialUrl?: string
  onAdded: (product: CatalogProduct) => Promise<void>
  onExisting: (product: CatalogProduct) => Promise<void>
}) {
  const [open, setOpen] = useState(Boolean(initialUrl))
  const [saving, setSaving] = useState(false)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!saving) setOpen(next)
      }}
    >
      <Dialog.Trigger
        className="pressable focus-ring grid size-12 translate-y-0.5 cursor-pointer place-items-center rounded-full border-0 bg-text p-0 text-bg hover:scale-[1.04]"
        aria-label="Add product"
      >
        <PlusIcon className="size-6 fill-current" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <ImportProductForm
          boardId={boardId}
          initialUrl={initialUrl}
          onSaving={setSaving}
          onAdded={async (product) => {
            await onAdded(product)
            setSaving(false)
            setOpen(false)
          }}
          onExisting={async (product) => {
            await onExisting(product)
            setSaving(false)
            setOpen(false)
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function ImportProductForm({
  boardId,
  initialUrl,
  onSaving,
  onAdded,
  onExisting,
}: {
  boardId: string
  initialUrl: string
  onSaving: (saving: boolean) => void
  onAdded: (product: CatalogProduct) => Promise<void>
  onExisting: (product: CatalogProduct) => Promise<void>
}) {
  const [preview, setPreview] = useState<ProductImportPreview | null>(null)
  const [showSetup, setShowSetup] = useState(false)
  const backRef = useRef<HTMLButtonElement>(null)
  const [duplicate, setDuplicate] = useState<CatalogProduct | null>(null)
  const [imageUrl, setImageUrl] = useState("")
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const requestPending = useRef(false)
  const [sourceUrl, setSourceUrl] = useState(initialUrl)
  const [slow, setSlow] = useState(false)
  const [uploadUrl, setUploadUrl] = useState("")
  const phase = busy
    ? preview ? "saving" : "finding"
    : preview ? "choosing" : "url"

  useEffect(() => {
    if (initialUrl) void loadPreview(initialUrl)
  }, [initialUrl])

  useEffect(() => {
    if (showSetup) backRef.current?.focus({ preventScroll: true })
  }, [showSetup])

  useEffect(() => {
    if (!imageFile) return setUploadUrl("")
    const url = URL.createObjectURL(imageFile)
    setUploadUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  useEffect(() => {
    setSlow(false)
    if (!busy) return
    const timer = setTimeout(() => setSlow(true), 10000)
    return () => clearTimeout(timer)
  }, [busy, preview])

  useEffect(() => {
    if (phase === "choosing")
      formRef.current
        ?.querySelector<HTMLButtonElement>("button[type=submit]")
        ?.focus({ preventScroll: true })
  }, [phase])

  async function loadPreview(url: string) {
    if (requestPending.current) return
    requestPending.current = true
    setError(null)
    setDuplicate(null)
    setBusy(true)
    formRef.current?.querySelector("input")?.blur()

    try {
      const result = await previewProduct({ data: { url, boardId } })

      setPreview(result)
      setImageUrl(result.recommendedImageUrl)
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be added."))
    } finally {
      setBusy(false)
      requestPending.current = false
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (requestPending.current) return
    if (!preview) return loadPreview(sourceUrl)
    requestPending.current = true
    onSaving(true)

    setError(null)
    setBusy(true)

    try {
      if (!preview.name || !preview.brand) {
        throw new Error("We couldn't identify this product.")
      }
      if (!imageUrl.trim() && !imageFile) {
        throw new Error("Choose or upload an image.")
      }

      const preparedImage = imageFile
        ? await compressProductImage(imageFile)
        : await compressRemoteProductImage(imageUrl.trim())
      if (preparedImage && preparedImage.size > maxUploadBytes) {
        throw new Error("That image is still larger than 20 MB after compression. Choose another one.")
      }

      const data = new FormData()
      const fields = {
        boardId,
        sourceUrl: preview.sourceUrl,
        canonicalUrl: preview.canonicalUrl,
        name: preview.name,
        brand: preview.brand,
        category: preview.category,
        imageUrl: preparedImage ? "" : imageUrl.trim(),
        method: preview.method,
      }

      for (const [field, value] of Object.entries(fields))
        data.append(field, value)
      if (preparedImage) data.append("imageFile", preparedImage, "product-image")

      const result = await createProduct({ data })
      if (result.kind === "duplicate") {
        setDuplicate(result.product)
        setBusy(false)
        requestPending.current = false
        onSaving(false)
        return
      }
      await onAdded(result.product)
    } catch (caught) {
      setError(errorMessage(caught, "The product could not be added."))
      setBusy(false)
      requestPending.current = false
      onSaving(false)
    }
  }

  if (showSetup) return (
    <MorphDialog phase="setup">
      <button ref={backRef} className="focus-ring mb-2 inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-muted hover:text-text" type="button" onClick={() => setShowSetup(false)}>
        <ChevronLeftIcon className="size-4 fill-current" /> Back to add product
      </button>
      <DialogHeading className="mb-4" closeLabel="Close add product dialog">Save while you browse</DialogHeading>
      <SaveSetup />
    </MorphDialog>
  )

  return (
    <MorphDialog phase={phase}>
      <form
        ref={formRef}
        aria-busy={busy || undefined}
        onSubmit={submit}
      >
        <div
          className={
            phase === "finding" || phase === "saving"
              ? "sr-only"
              : ""
          }
        >
          <DialogHeading
            className="mb-2"
            closeLabel={busy ? undefined : "Close add product dialog"}
          >
            {duplicate ? "Already saved" : preview ? "Make it yours" : "Add a product"}
          </DialogHeading>
        </div>
        {duplicate ? (
          <div className="flex flex-col gap-4">
            <p role="status">{duplicate.status === "archived" ? "This product was previously archived." : `Already in ${duplicate.status === "owned" ? "Owned" : "Wishlist"}.`}</p>
            <p className="text-sm text-muted">{duplicate.name} is already saved. You can move the existing product from its menu.</p>
            <button className={primaryButtonClass} type="button" onClick={() => {
              void (async () => {
                const product = duplicate.status === "archived"
                  ? await setProductStatus({ data: { id: duplicate.id, status: "wishlist" } })
                  : duplicate
                await onExisting(product)
              })().catch((caught) => setError(errorMessage(caught, "The product could not be opened.")))
            }}>
              {duplicate.status === "owned" ? "Owned" : duplicate.status === "archived" ? "Restore to wishlist" : "View wishlist"}
            </button>
          </div>
        ) : phase === "finding" ? (
          <div className="flex items-center gap-4" role="status">
            <span className="import-spinner shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium">Finding your product…</p>
              <p className="truncate text-sm text-muted">
                {slow
                  ? "This shop is taking a little longer"
                  : new URL(sourceUrl).hostname.replace(/^www\./, "")}
              </p>
            </div>
            <Dialog.Close
              className="focus-ring ml-auto grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-muted"
              aria-label="Cancel product lookup"
            >
              ×
            </Dialog.Close>
          </div>
        ) : preview ? (
          <section className="grid gap-4">
            <div
              className="import-hero"
              hidden={!uploadUrl && !imageUrl}
            >
              {(uploadUrl || imageUrl) && (
                <img
                  src={uploadUrl || imageUrl}
                  alt={preview.name}
                  referrerPolicy="no-referrer"
                />
              )}
              {phase === "saving" && (
                <span className="import-image-glow" aria-hidden="true" />
              )}
            </div>
            {phase === "choosing" ? (
              <>
                <div className="text-center">
                  <p className="text-xs tracking-wider text-muted uppercase">
                    {preview.brand}
                  </p>
                  <p className="mt-1 font-medium">{preview.name}</p>
                </div>
                <ImagePicker
                  imageUrls={preview.imageUrls}
                  value={imageUrl}
                  onChange={setImageUrl}
                  file={imageFile}
                  onFileChange={setImageFile}
                  onError={setError}
                />
                {preview.warning && (
                  <p className="text-sm text-muted" role="status">
                    {preview.warning}
                  </p>
                )}
                <button className={primaryButtonClass} type="submit">
                  Save product
                </button>
              </>
            ) : (
              <div className="text-center" role="status" aria-live="polite">
                <p className="flex items-center justify-center gap-2 font-medium">
                  <span className="import-spinner import-spinner-small" aria-hidden="true" />
                  Preparing your image…
                </p>
                {slow && <p className="mt-1 text-sm text-muted">Still working on your image…</p>}
              </div>
            )}
          </section>
        ) : (
          <div>
            <p className="mb-6 text-muted">
              Something worth keeping? Drop the link.
            </p>
            <label className="sr-only" htmlFor="product-url">
              Product URL
            </label>
            <div className="flex gap-2">
              <input
                className={urlInputClass}
                id="product-url"
                name="url"
                type="url"
                inputMode="url"
                autoComplete="url"
                placeholder="Paste a product link"
                autoFocus
                required
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                onPaste={() =>
                  setTimeout(() => formRef.current?.requestSubmit())
                }
              />
              <button
                className={`${primaryButtonClass} h-11 py-0`}
                type="submit"
              >
                Find
              </button>
            </div>
            <button className="focus-ring mt-4 inline-flex min-h-11 cursor-pointer items-center text-sm text-muted underline underline-offset-4 hover:text-text" type="button" onClick={() => setShowSetup(true)}>
              Save from your browser or iPhone
            </button>
          </div>
        )}
        <ErrorMessage message={error} />
      </form>
    </MorphDialog>
  )
}

function ImagePicker({
  imageUrls,
  value,
  onChange,
  file,
  onFileChange,
  onError,
}: {
  imageUrls: string[]
  value: string
  onChange: (imageUrl: string) => void
  file: File | null
  onFileChange: (file: File | null) => void
  onError: (message: string | null) => void
}) {
  const [broken, setBroken] = useState<Set<string>>(new Set())
  const usable = imageUrls.filter((url) => !broken.has(url))
  const viewportRef = useRef<HTMLDivElement>(null)

  // If the chosen image fails to load, fall back to the next usable one.
  useEffect(() => {
    if (!broken.has(value)) return

    onChange(usable[0] ?? "")
  }, [broken, onChange, usable, value])

  function scroll(direction: -1 | 1) {
    const viewport = viewportRef.current

    viewport?.scrollBy({
      left: direction * viewport.clientWidth * 0.8,
      behavior: "smooth",
    })
  }

  return (
    <fieldset className="min-w-0 border-0 p-0">
      <legend className="sr-only">Choose an image</legend>
      <ScrollArea.Root
        overflowEdgeThreshold={4}
        className="group/carousel grid grid-cols-[1fr_auto_auto] items-center gap-x-1 gap-y-2"
      >
        <p className="text-sm font-semibold" aria-hidden="true">
          Choose an image
        </p>
        <button
          className="carousel-control col-start-2 row-start-1 group-data-[overflow-x-start]/carousel:visible"
          type="button"
          aria-label="Previous images"
          onClick={() => scroll(-1)}
        >
          <ChevronLeftIcon className="size-5 fill-current" />
        </button>
        <ScrollArea.Viewport
          className="scrollbar-hidden col-span-3 row-start-2 min-w-0 snap-x snap-mandatory scroll-p-0.5 overscroll-x-contain p-0.5"
          ref={viewportRef}
        >
          <ScrollArea.Content className="grid grid-flow-col auto-cols-[4.5rem] justify-start gap-2">
            {imageUrls.map((url, index) => (
              <label
                className="focus-ring relative m-0 aspect-[4/5] cursor-pointer snap-start overflow-hidden rounded-lg border-2 border-transparent bg-bg has-[input:checked]:border-text has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2"
                key={url}
                hidden={broken.has(url)}
              >
                <input
                  className="absolute opacity-0"
                  type="radio"
                  name="imageChoice"
                  value={url}
                  checked={value === url}
                  disabled={broken.has(url)}
                  aria-label={`Product image ${index + 1}`}
                  onChange={() => onChange(url)}
                />
                <img
                  className="size-full object-contain"
                  src={url}
                  alt=""
                  loading="eager"
                  referrerPolicy="no-referrer"
                  onError={() => setBroken((prev) => new Set(prev).add(url))}
                />
              </label>
            ))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <button
          className="carousel-control col-start-3 row-start-1 group-data-[overflow-x-end]/carousel:visible"
          type="button"
          aria-label="Next images"
          onClick={() => scroll(1)}
        >
          <ChevronRightIcon className="size-5 fill-current" />
        </button>
      </ScrollArea.Root>
      {usable.length === 0 && (
        <>
          {!file && (
            <p className="mt-2 text-sm text-muted">
              We could not find an image for this product.
            </p>
          )}
          <ImageUpload file={file} onChange={onFileChange} onError={onError} />
        </>
      )}
    </fieldset>
  )
}

// Shown only when the shop exposed no usable image. Drop a file or click.
function ImageUpload({
  file,
  onChange,
  onError,
}: {
  file: File | null
  onChange: (file: File | null) => void
  onError: (message: string | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return setPreviewUrl(null)

    const url = URL.createObjectURL(file)

    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [file])

  function accept(candidate: File | undefined) {
    if (!candidate) return
    if (!candidate.type.startsWith("image/"))
      return onError("Choose an image file.")

    onError(null)
    onChange(candidate)
  }

  return (
    <div
      className="relative mt-2"
      onDragEnter={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        accept(event.dataTransfer.files[0])
      }}
    >
      <input
        className="peer absolute size-px border-0 p-0 opacity-0"
        id="image-file"
        name="imageFile"
        type="file"
        accept="image/*"
        onChange={(event) => accept(event.target.files?.[0])}
      />
      <label
        className={`grid min-h-44 cursor-pointer content-center justify-items-center gap-4 rounded-xl border border-dashed border-border bg-bg p-6 text-center transition-[background,border-color] duration-[140ms] ease-out peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-current hover:border-muted hover:bg-surface ${dragging ? "border-solid border-text bg-surface" : ""}`}
        htmlFor="image-file"
      >
        {previewUrl && (
          <img
            className="max-h-56 max-w-full rounded-lg object-contain"
            src={previewUrl}
            alt="Selected image"
          />
        )}
        <span className="grid justify-items-center gap-1 text-sm font-normal text-muted">
          {!file && <UploadIcon className="mb-2 size-7 fill-current" />}
          {!file && (
            <span className="font-semibold text-text">
              Upload your own image
            </span>
          )}
          <span>
            {file
              ? "Click or drop another image to replace it"
              : "Drop an image here or click to browse"}
          </span>
        </span>
      </label>
    </div>
  )
}
