import type { CollectionAfterChangeHook } from 'payload'
import { sendEmail } from '@/lib/email'
import { WelcomeEmail } from '@/lib/email-templates'
import { getBrand } from '@/lib/brand'
import React from 'react'

export const afterUserCreate: CollectionAfterChangeHook = async ({
  doc,
  operation,
  context,
}) => {
  if (operation === 'create' && !context?.skipWelcomeEmail) {
    // Fire-and-forget: don't block the API response
    ;(async () => {
      const brand = await getBrand()
      await sendEmail({
        to: doc.email,
        subject: `${brand.subjectPrefix}会員登録完了のお知らせ`,
        react: React.createElement(WelcomeEmail, {
          name: doc.name || doc.email,
          brandName: brand.name,
          emailFooterTagline: brand.emailFooterTagline,
        }),
      })
    })().catch((err) => {
      console.error('[Hook] Welcome email error:', err)
    })
  }
  return doc
}
