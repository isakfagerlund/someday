import { Dialog } from "@base-ui/react/dialog"
import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

// Both flows share their shape transition and follow Safari's visible viewport.
export function MorphDialog({ children, phase }: { children: ReactNode; phase: string }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>()
  const [viewport, setViewport] = useState<{ top: number; height: number }>()

  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const observer = new ResizeObserver(() => setHeight(content.getBoundingClientRect().height))
    observer.observe(content)
    const visualViewport = window.visualViewport
    const updateViewport = () => {
      if (visualViewport) setViewport({ top: visualViewport.offsetTop, height: visualViewport.height })
    }
    updateViewport()
    visualViewport?.addEventListener("resize", updateViewport)
    visualViewport?.addEventListener("scroll", updateViewport)
    return () => {
      observer.disconnect()
      visualViewport?.removeEventListener("resize", updateViewport)
      visualViewport?.removeEventListener("scroll", updateViewport)
    }
  }, [])

  return (
    <Dialog.Popup
      className="import-dialog"
      data-phase={phase}
      style={{ height, top: viewport ? viewport.top + viewport.height / 2 : undefined, maxHeight: viewport ? Math.max(0, viewport.height - 32) : undefined }}
    >
      <div ref={contentRef} className="import-content">{children}</div>
    </Dialog.Popup>
  )
}
