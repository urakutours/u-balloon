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

const DRY_RUN = process.argv.includes('--dry-run')

// Phase B: 10 new columns for MakeShop member migration
// Column names follow Payload v3 convention: camelCase → snake_case
// Types match existing patterns in users table
const alterStatements = [
  // Text fields → varchar
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS name_kana varchar`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_phone varchar`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS postal_code varchar`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line1 varchar`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS address_line2 varchar`,

  // Select fields → enum types
  // gender: male/female/unspecified (matching Users.ts options)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_users_gender') THEN
      CREATE TYPE enum_users_gender AS ENUM ('male', 'female', 'unspecified');
    END IF;
  END $$`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender enum_users_gender DEFAULT 'unspecified'`,

  // prefecture: 47 prefectures as varchar (too many for enum, Payload uses varchar for large selects)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS prefecture varchar`,

  // Date fields → timestamptz
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday timestamptz`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS legacy_registered_at timestamptz`,

  // Checkbox → boolean
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS newsletter_subscribed boolean DEFAULT false`,
]

try {
  console.log(`\n=== Phase B: Add 10 columns to users table ===`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`)

  for (const sql of alterStatements) {
    const preview = sql.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
    if (DRY_RUN) {
      console.log(`  [DRY] ${preview}`)
    } else {
      console.log(`  RUN: ${preview}...`)
      await pool.query(sql)
      console.log(`       ✓ OK`)
    }
  }

  // Verify
  if (!DRY_RUN) {
    console.log('\n=== Verification ===')
    const res = await pool.query(`
      SELECT column_name, udt_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `)
    const newCols = ['name_kana', 'mobile_phone', 'gender', 'birthday',
      'newsletter_subscribed', 'postal_code', 'prefecture',
      'address_line1', 'address_line2', 'legacy_registered_at']
    for (const col of newCols) {
      const found = res.rows.find(r => r.column_name === col)
      console.log(`  ${col.padEnd(25)} ${found ? `✓ ${found.udt_name}` : '✗ MISSING'}`)
    }
    console.log(`\nTotal columns: ${res.rows.length}`)
  }

  console.log('\n=== Done ===\n')
} catch (err) {
  console.error('Error:', err.message)
  process.exit(1)
} finally {
  await pool.end()
}
