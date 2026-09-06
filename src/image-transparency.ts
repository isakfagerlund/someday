/** A transparent background, not just an alpha channel or a few clear corners. */
export function hasTransparentBackground(
  rgba: Uint8Array,
  width: number,
  height: number,
) {
  if (width < 2 || height < 2 || rgba.length !== width * height * 4)
    return false

  let clearPixels = 0
  let clearBorderPixels = 0
  const borderPixels = 2 * width + 2 * height - 4

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Allow tiny alpha values left by resizing soft edges and shadows.
      if (rgba[(y * width + x) * 4 + 3]! > 8) continue
      clearPixels++
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        clearBorderPixels++
      }
    }
  }

  // Conservative defaults: a real clear background around most of the subject.
  return (
    clearPixels / (width * height) >= 0.1 &&
    clearBorderPixels / borderPixels >= 0.75
  )
}
