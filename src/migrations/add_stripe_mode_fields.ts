import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
    ADD COLUMN IF NOT EXISTS "stripe_mode" varchar DEFAULT 'test',
    ADD COLUMN IF NOT EXISTS "stripe_test_publishable_key" varchar,
    ADD COLUMN IF NOT EXISTS "stripe_test_secret_key" varchar,
    ADD COLUMN IF NOT EXISTS "stripe_test_webhook_secret" varchar,
    ADD COLUMN IF NOT EXISTS "stripe_live_publishable_key" varchar,
    ADD COLUMN IF NOT EXISTS "stripe_live_secret_key" varchar,
    ADD COLUMN IF NOT EXISTS "stripe_live_webhook_secret" varchar
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
    DROP COLUMN IF EXISTS "stripe_mode",
    DROP COLUMN IF EXISTS "stripe_test_publishable_key",
    DROP COLUMN IF EXISTS "stripe_test_secret_key",
    DROP COLUMN IF EXISTS "stripe_test_webhook_secret",
    DROP COLUMN IF EXISTS "stripe_live_publishable_key",
    DROP COLUMN IF EXISTS "stripe_live_secret_key",
    DROP COLUMN IF EXISTS "stripe_live_webhook_secret"
  `)
}
