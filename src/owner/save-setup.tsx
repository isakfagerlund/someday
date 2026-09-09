import { primaryButtonClass } from "./ui"

export function SaveSetup() {
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
        <h2 className="text-xl font-medium" id="browser-heading">In Chrome</h2>
        <p className="text-muted">Pin the someday extension to your toolbar. Click it on a product page to choose a board and save.</p>
        <a className={`${primaryButtonClass} inline-flex min-h-12 items-center no-underline`} href="/extensions/someday-chrome.zip" download>Download Chrome extension</a>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Unzip the download and keep the folder on your computer.</li>
          <li>Open <code>chrome://extensions</code> and turn on Developer mode.</li>
          <li>Click Load unpacked and select the unzipped folder.</li>
          <li>Open Chrome’s extensions menu and pin Save to someday.</li>
        </ol>
        <p className="text-sm text-muted">This first version installs manually. It is not listed in the Chrome Web Store yet.</p>
      </section>
    </>
  )
}
