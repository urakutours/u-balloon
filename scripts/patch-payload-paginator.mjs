/**
 * Build-time patch for @payloadcms/ui PageControls component.
 * Sets numberOfNeighbors from 1 → 4 so paginator shows <> 1 2 3 4 5 — N format.
 * Runs in Vercel build regardless of postinstall behavior.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const targetPath = resolve(process.cwd(), 'node_modules/@payloadcms/ui/dist/elements/PageControls/index.js')

if (!existsSync(targetPath)) {
  console.log('[patch-payload-paginator] target not found (skipping):', targetPath)
  process.exit(0)
}

const content = readFileSync(targetPath, 'utf8')

if (content.includes('numberOfNeighbors: 4,')) {
  console.log('[patch-payload-paginator] already patched, nothing to do')
  process.exit(0)
}

if (!content.includes('numberOfNeighbors: 1,')) {
  console.warn('[patch-payload-paginator] expected pattern "numberOfNeighbors: 1," not found — Payload UI version mismatch?')
  console.warn('[patch-payload-paginator] NOT failing build. Check upstream @payloadcms/ui source.')
  process.exit(0)
}

const patched = content.replace('numberOfNeighbors: 1,', 'numberOfNeighbors: 4,')
writeFileSync(targetPath, patched, 'utf8')
console.log('[patch-payload-paginator] patched numberOfNeighbors 1 → 4 in', targetPath)
