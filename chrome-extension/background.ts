const saveOrigin = "__SOMEDAY_ORIGIN__"

chrome.action.onClicked.addListener((tab) => {
  const destination = new URL("/save", saveOrigin)
  destination.searchParams.set("url", tab.url ?? "")
  void chrome.tabs.create({ url: destination.href }).catch(console.error)
})
