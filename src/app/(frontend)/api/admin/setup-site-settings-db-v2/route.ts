/**
 * One-time migration v2:
 *   - Add company info columns (9) and site basic settings columns (2) to site_settings table
 *   - Create site_settings_shipping_regional_fees array table
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
    // 1. Add new columns to site_settings
    await pool.query(`
      ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "company_name" varchar,
      ADD COLUMN IF NOT EXISTS "company_representative" varchar,
      ADD COLUMN IF NOT EXISTS "company_postal_code" varchar,
      ADD COLUMN IF NOT EXISTS "company_address" varchar,
      ADD COLUMN IF NOT EXISTS "company_phone" varchar,
      ADD COLUMN IF NOT EXISTS "company_business_hours" varchar,
      ADD COLUMN IF NOT EXISTS "company_contact_email" varchar,
      ADD COLUMN IF NOT EXISTS "site_title" varchar,
      ADD COLUMN IF NOT EXISTS "site_description" text
    `)

    // 2. Create shipping_regional_fees array table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "site_settings_shipping_regional_fees" (
        "_order" integer NOT NULL,
        "_parent_id" integer NOT NULL,
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "region" varchar,
        "fee" numeric,
        "note" varchar,
        CONSTRAINT "site_settings_shipping_regional_fees_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "site_settings_shipping_regional_fees_parent_fk"
          FOREIGN KEY ("_parent_id")
          REFERENCES "site_settings"("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "site_settings_shipping_regional_fees_order_idx"
        ON "site_settings_shipping_regional_fees" ("_order")
    `)

    await pool.query(`
      CREATE INDEX IF NOT EXISTS "site_settings_shipping_regional_fees_parent_idx"
        ON "site_settings_shipping_regional_fees" ("_parent_id")
    `)

    return NextResponse.json({
      success: true,
      message: 'Migration v2 complete: 9 company columns + 2 site columns added; shipping_regional_fees table created',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  } finally {
    await pool.end()
  }
}
