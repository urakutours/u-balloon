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

try {
  const r = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'form_submissions'
    ORDER BY ordinal_position
  `)
  console.log('=== form_submissions columns ===')
  for (const row of r.rows) {
    console.log(`  ${row.column_name.padEnd(25)} ${row.udt_name.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}  default: ${row.column_default || '(none)'}`)
  }

  const hasStatus = r.rows.some(x => x.column_name === 'status')
  const hasResponded = r.rows.some(x => x.column_name === 'responded_at')
  console.log(`\nstatus column: ${hasStatus ? 'EXISTS' : 'MISSING'}`)
  console.log(`responded_at column: ${hasResponded ? 'EXISTS' : 'MISSING'}`)
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
