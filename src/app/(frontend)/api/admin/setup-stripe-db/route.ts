import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.PAYLOAD_SECRET}`
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DATABASE_URI || '',
    ssl: { rejectUnauthorized: false },
  })

  try {
    await pool.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "stripe_mode" varchar DEFAULT 'test',
      ADD COLUMN IF NOT EXISTS "stripe_test_publishable_key" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_test_secret_key" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_test_webhook_secret" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_live_publishable_key" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_live_secret_key" varchar,
      ADD COLUMN IF NOT EXISTS "stripe_live_webhook_secret" varchar
    `)
    return NextResponse.json({ success: true, message: 'Stripe DB columns added (or already existed)' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
