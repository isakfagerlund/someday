const escapedCharacters = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
} as const

export function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      escapedCharacters[character as keyof typeof escapedCharacters],
  )
}
