import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(import.meta.dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) process.env[m[1]] = m[2].trim()
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const renames = [
  ['sender_sender_address_line_1', 'sender_sender_address_line1'],
  ['sender_sender_address_line_2', 'sender_sender_address_line2'],
  ['recipient_recipient_address_line_1', 'recipient_recipient_address_line1'],
  ['recipient_recipient_address_line_2', 'recipient_recipient_address_line2'],
]

try {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'orders'
  `)
  const existing = new Set(rows.map((r) => r.column_name))
  console.log('Existing orders columns matching pattern:')
  for (const c of [...existing].filter((c) => c.includes('address_line'))) {
    console.log(`  - ${c}`)
  }

  for (const [from, to] of renames) {
    if (existing.has(to)) {
      console.log(`✓ ${to} already exists — skipping`)
      continue
    }
    if (!existing.has(from)) {
      console.log(`! neither ${from} nor ${to} exists — skipping`)
      continue
    }
    await pool.query(`ALTER TABLE "orders" RENAME COLUMN "${from}" TO "${to}"`)
    console.log(`→ renamed ${from} → ${to}`)
  }

  const { rows: after } = await pool.query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' AND column_name LIKE '%address_line%'
  `)
  console.log('\nAfter rename:')
  for (const r of after) console.log(`  - ${r.column_name}`)
} catch (err) {
  console.error('ERROR:', err)
  process.exitCode = 1
} finally {
  await pool.end()
}
