/**
 * One-time migration v3:
 *   - Add site_og_image_url, shipping_restricted_areas, payment_methods_text columns
 * DELETE THIS FILE after running once in production.
 */
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
      ADD COLUMN IF NOT EXISTS "site_og_image_url" varchar,
      ADD COLUMN IF NOT EXISTS "shipping_restricted_areas" varchar,
      ADD COLUMN IF NOT EXISTS "payment_methods_text" text
    `)
    return NextResponse.json({
      success: true,
      message: 'Migration v3 complete: site_og_image_url, shipping_restricted_areas, payment_methods_text columns added',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
