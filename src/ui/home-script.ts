export const homeScript = String.raw`
const boardDialog = document.querySelector("#board-dialog")

if (boardDialog && !boardDialog.open) boardDialog.showModal()
`
