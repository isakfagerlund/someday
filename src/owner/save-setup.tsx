import { useEffect, useRef, useState } from "react"

import { primaryButtonClass } from "./ui"

export function SaveSetup() {
  const bookmarkRef = useRef<HTMLAnchorElement>(null)
  const [bookmarklet, setBookmarklet] = useState("")
  const [copyMessage, setCopyMessage] = useState("")

  useEffect(() => {
    const script = `javascript:void(window.open(${JSON.stringify(`${location.origin}/save?url=`)}+encodeURIComponent(location.href),'_blank','noopener,noreferrer'))`
    setBookmarklet(script)
    // React blocks javascript: hrefs. This fixed, first-party script is a
    // draggable bookmark, never code supplied by a product page or query string.
    bookmarkRef.current?.setAttribute("href", script)
  }, [])

  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-medium">Keep a good find</h1>
        <p className="text-muted">Send a product straight to someday while you browse. Choose your board, check the image, and save.</p>
      </div>
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-6" aria-labelledby="iphone-heading">
        <h2 className="text-xl font-medium" id="iphone-heading">On your iPhone</h2>
        <p className="text-muted">Add the shortcut, then open a product page and tap Share → Save to someday.</p>
        <a className={`${primaryButtonClass} inline-flex min-h-12 items-center no-underline`} href="/shortcuts/Save%20to%20someday.shortcut" download="Save to someday.shortcut">Get the iPhone Shortcut</a>
        <p className="text-sm text-muted">Open the downloaded file in Shortcuts and tap Add Shortcut. If it is missing from the share sheet, scroll down to Edit Actions and add it to your favorites.</p>
      </section>
      <section className="flex flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-6" aria-labelledby="browser-heading">
        <h2 className="text-xl font-medium" id="browser-heading">In your desktop browser</h2>
        <p className="text-muted">Drag this button to your bookmarks bar. Click the bookmark whenever you find a product.</p>
        <a
          ref={bookmarkRef}
          className="focus-ring inline-flex min-h-12 cursor-grab items-center rounded-pill border border-border px-5 font-medium no-underline active:cursor-grabbing"
          draggable
          href="#browser-heading"
          onClick={(event) => { event.preventDefault(); setCopyMessage("Drag this button to your bookmarks bar, then use it on a product page.") }}
        >Save to someday</a>
        <details className="w-full text-sm">
          <summary className="focus-ring min-h-11 cursor-pointer content-center text-muted">Prefer to add it manually?</summary>
          <p className="my-3 text-muted">Create a bookmark named Save to someday and paste this into its URL field.</p>
          <textarea className="focus-ring w-full rounded-lg border border-border bg-bg p-3 text-xs" aria-label="Bookmark URL" rows={4} readOnly value={bookmarklet} onFocus={(event) => event.target.select()} />
          <button className="focus-ring min-h-11 cursor-pointer underline underline-offset-4" type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(bookmarklet)
              setCopyMessage("Bookmark URL copied")
            } catch {
              setCopyMessage("Select the bookmark URL above and copy it manually.")
            }
          }}>Copy bookmark URL</button>
        </details>
        <p className="text-sm text-muted" role="status">{copyMessage}</p>
      </section>
    </>
  )
}
