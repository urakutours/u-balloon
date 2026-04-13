import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually
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
  const res = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `)
  console.log('=== Current users table columns ===')
  for (const row of res.rows) {
    console.log(`  ${row.column_name.padEnd(30)} ${row.udt_name.padEnd(15)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}  ${row.column_default || ''}`)
  }
  console.log(`\nTotal: ${res.rows.length} columns`)
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
