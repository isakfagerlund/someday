export const homeScript = String.raw`
const boardDialog = document.querySelector("#board-dialog")
const boardNameInput = document.querySelector("#board-name")
const boardSlugPreview = document.querySelector("[data-board-slug-preview]")
const unavailableSlugs = new Set(
  (boardDialog?.dataset.unavailableSlugs ?? "").split(","),
)

function slugFromName(name) {
  return name
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function updateBoardSlugPreview() {
  const baseSlug = slugFromName(boardNameInput?.value ?? "")
  let slug = baseSlug
  let suffix = 2

  while (slug && unavailableSlugs.has(slug)) {
    slug = baseSlug + "-" + suffix
    suffix += 1
  }

  if (boardSlugPreview) boardSlugPreview.textContent = slug || "your-board"
}

if (boardDialog && !boardDialog.open) boardDialog.showModal()
boardNameInput?.addEventListener("input", updateBoardSlugPreview)
updateBoardSlugPreview()
`
