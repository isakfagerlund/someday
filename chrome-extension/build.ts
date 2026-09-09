import { execFileSync } from "node:child_process"
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const root = new URL("../", import.meta.url)
const output = new URL("dist/chrome-extension/", root)
const archive = new URL("public/extensions/someday-chrome.zip", root)
const origin = new URL(process.env.SOMEDAY_CAPTURE_ORIGIN ?? "https://someday.fyi").origin
const source = await readFile(new URL("background.ts", import.meta.url), "utf8")
const compiled = ts.transpileModule(
  source.replace('"__SOMEDAY_ORIGIN__"', JSON.stringify(origin)),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } },
)

await mkdir(output, { recursive: true })
await mkdir(new URL("public/extensions/", root), { recursive: true })
await writeFile(new URL("background.js", output), compiled.outputText)
await copyFile(new URL("manifest.json", import.meta.url), new URL("manifest.json", output))
await copyFile(new URL("public/favicon-32.png", root), new URL("icon-32.png", output))
await copyFile(new URL("public/icon-192.png", root), new URL("icon-192.png", output))
await rm(archive, { force: true })
execFileSync("zip", ["-j", fileURLToPath(archive), "manifest.json", "background.js", "icon-32.png", "icon-192.png"], {
  cwd: output,
  stdio: "inherit",
})
console.log(`Chrome extension built for ${origin}`)
