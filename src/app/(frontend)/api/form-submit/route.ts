import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { sendEmail } from '@/lib/email'
import React from 'react'
import { FormNotificationEmail } from '@/lib/email-templates'
import { getBrand } from '@/lib/brand'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { formSlug, data } = body

    if (!formSlug || !data) {
      return NextResponse.json({ error: 'formSlug and data are required' }, { status: 400 })
    }

    const payload = await getPayload({ config })

    // Fetch form definition
    const formResult = await payload.find({
      collection: 'forms',
      where: { slug: { equals: formSlug } },
      limit: 1,
    })

    const form = formResult.docs[0]
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Save submission
    const submission = await payload.create({
      collection: 'form-submissions',
      data: {
        form: form.id,
        data,
        submitterEmail: data.email || undefined,
      },
    })

    // Send notification emails
    const notifyEmails = (form as any).notifyEmails as string[] | undefined
    if (notifyEmails?.length) {
      const formFields = (form as any).fields as Array<{ name: string; label: string }>
      const brand = await getBrand()
      for (const email of notifyEmails) {
        sendEmail({
          to: email,
          subject: `${brand.subjectPrefix}${form.title}に新しい送信がありました`,
          react: React.createElement(FormNotificationEmail, {
            formTitle: form.title as string,
            fields: formFields,
            data,
            brandName: brand.name,
            emailFooterTagline: brand.emailFooterTagline,
          }),
        }).catch(console.error)
      }
    }

    return NextResponse.json({
      success: true,
      message: (form as any).confirmationMessage || '送信が完了しました。',
    })
  } catch (error) {
    console.error('Form submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
