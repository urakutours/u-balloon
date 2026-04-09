/**
 * One-time migration: Add shipping, bank transfer, and SNS columns to site_settings table.
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
      ADD COLUMN IF NOT EXISTS "shipping_origin_address" varchar,
      ADD COLUMN IF NOT EXISTS "shipping_standard_base_fee" numeric,
      ADD COLUMN IF NOT EXISTS "shipping_standard_free_distance_km" numeric,
      ADD COLUMN IF NOT EXISTS "shipping_delivery_base_fee" numeric,
      ADD COLUMN IF NOT EXISTS "shipping_delivery_free_distance_km" numeric,
      ADD COLUMN IF NOT EXISTS "shipping_extra_per_km_fee" numeric,
      ADD COLUMN IF NOT EXISTS "shipping_delivery_free_threshold" numeric,
      ADD COLUMN IF NOT EXISTS "bank_name" varchar,
      ADD COLUMN IF NOT EXISTS "bank_branch_name" varchar,
      ADD COLUMN IF NOT EXISTS "bank_account_type" varchar,
      ADD COLUMN IF NOT EXISTS "bank_account_number" varchar,
      ADD COLUMN IF NOT EXISTS "bank_account_holder" varchar,
      ADD COLUMN IF NOT EXISTS "bank_transfer_deadline_days" numeric,
      ADD COLUMN IF NOT EXISTS "sns_instagram_url" varchar,
      ADD COLUMN IF NOT EXISTS "sns_line_url" varchar,
      ADD COLUMN IF NOT EXISTS "sns_x_url" varchar,
      ADD COLUMN IF NOT EXISTS "sns_facebook_url" varchar,
      ADD COLUMN IF NOT EXISTS "sns_tiktok_url" varchar,
      ADD COLUMN IF NOT EXISTS "sns_youtube_url" varchar
    `)
    return NextResponse.json({
      success: true,
      message: 'SiteSettings DB columns added (or already existed): shipping, bank transfer, SNS (19 columns)',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
