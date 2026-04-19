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
    SELECT
      id,
      stripe_mode,
      CASE WHEN stripe_secret_key IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_secret_key) || ')' END AS legacy_secret,
      CASE WHEN stripe_webhook_secret IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_webhook_secret) || ')' END AS legacy_webhook,
      CASE WHEN stripe_test_secret_key IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_test_secret_key) || ')' END AS test_secret,
      CASE WHEN stripe_live_secret_key IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_live_secret_key) || ')' END AS live_secret,
      CASE WHEN stripe_test_webhook_secret IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_test_webhook_secret) || ')' END AS test_webhook,
      CASE WHEN stripe_live_webhook_secret IS NULL THEN 'NULL' ELSE 'SET (' || LENGTH(stripe_live_webhook_secret) || ')' END AS live_webhook
    FROM site_settings
  `)
  for (const row of r.rows) console.log(row)
} catch (err) {
  console.error('Error:', err.message)
} finally {
  await pool.end()
}
