const maxDimension = 2000

/** WebP keeps transparent cutouts while reducing the upload size. */
export async function compressProductImage(source: Blob) {
  const image = await createImageBitmap(source)

  try {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const context = canvas.getContext("2d")
    if (!context) throw new Error("Could not prepare this image.")

    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const compressed = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("Could not compress this image.")),
        "image/webp",
        0.9,
      )
    })

    // Avoid making an already small image larger when no resize was needed.
    return scale === 1 && source.size < compressed.size ? source : compressed
  } finally {
    image.close()
  }
}

export async function compressRemoteProductImage(url: string) {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) return null
    return await compressProductImage(await response.blob())
  } catch {
    // Some shops disallow CORS. Let the server download those images as before.
    return null
  }
}
