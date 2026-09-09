const ease = "cubic-bezier(0.23, 1, 0.32, 1)"

export async function animatePurchase(productId: string) {
  const card = document.getElementById(`product-${productId}`)
  const image = card?.querySelector<HTMLElement>("[data-product-image]")
  if (!card || !image || matchMedia("(prefers-reduced-motion: reduce)").matches) return

  const bounds = image.getBoundingClientRect()
  const shell = document.createElement("div")
  shell.className = "purchase-morph"
  shell.setAttribute("aria-hidden", "true")
  Object.assign(shell.style, {
    left: `${bounds.width / 2}px`, top: `${bounds.height / 2}px`,
    width: `${bounds.width}px`, height: `${bounds.height}px`,
  })
  const photo = image.querySelector("img")?.cloneNode(true) as HTMLImageElement | undefined
  if (photo) shell.appendChild(photo)
  const icon = document.createElement("div")
  icon.className = "purchase-icon"
  icon.innerHTML = `<svg viewBox="0 0 256 256" fill="currentColor"><path d="M128 24 16 120l10.4 12.1L40 120.4V216h72v-64h32v64h72v-95.6l13.6 11.7L240 120ZM96 200H56v-93.3l72-61.7 72 61.7V200h-40v-64H96Z"/></svg>`
  shell.appendChild(icon)
  card.appendChild(shell)

  const animations: Animation[] = []
  function animate(element: Element, frames: Keyframe[], duration: number, delay = 0) {
    const animation = element.animate(frames, { duration, delay, easing: ease, fill: "both" })
    animations.push(animation)
    return animation
  }

  try {
    animate(card.querySelector("article")!, [{ opacity: 1 }, { opacity: 0, filter: "blur(4px)", transform: "scale(0.97)" }], 220)
    if (photo) animate(photo, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.8)", filter: "blur(8px)" }], 280)
    const morph = animate(shell, [
      { width: `${bounds.width}px`, height: `${bounds.height}px`, borderRadius: "8px", background: "var(--color-surface)" },
      { width: "96px", height: "96px", borderRadius: "48px", background: "var(--color-surface)" },
    ], 560)
    animate(icon, [{ opacity: 0, transform: "scale(0.25)", filter: "blur(4px)" }, { opacity: 1, transform: "scale(1)", filter: "blur(0px)" }], 300, 200)
    await morph.finished

    const destination = document.getElementById("owned-navigation")
    const target = destination?.getBoundingClientRect()
    const current = shell.getBoundingClientRect()
    const dx = target ? target.left + target.width / 2 - current.left - current.width / 2 : 0
    const dy = target ? target.top + target.height / 2 - current.top - current.height / 2 : -24
    await animate(shell, [
      { transform: "translate(0, 0) scale(1)", opacity: 1, offset: 0 },
      { opacity: 1, offset: 0.65 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0 },
    ], 460, 250).finished
    destination?.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 300, easing: ease })
  } finally {
    shell.remove()
    // Keep the original hidden until React removes it in the same frame.
    requestAnimationFrame(() => animations.forEach((animation) => animation.cancel()))
  }
}
