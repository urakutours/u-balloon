'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordContent() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setError('メールアドレスを入力してください')
      setIsSubmitting(false)
      return
    }

    try {
      // Always show success regardless of whether the user exists.
      // Payload's forgot-password endpoint silently returns success for
      // non-existent emails to avoid leaking user enumeration.
      await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSubmitted(true)
    } catch {
      // Network failures still surface a generic error.
      setError('送信に失敗しました。時間をおいて再度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <Card className="w-full rounded-xl border">
        <CardHeader>
          <Image
            src="/logo.svg"
            alt="uballoon"
            width={120}
            height={34}
            className="mx-auto mb-4 h-8 w-auto"
          />
          <CardTitle className="text-2xl">パスワード再設定</CardTitle>
          <CardDescription>
            ご登録のメールアドレスに、パスワード再設定用のリンクをお送りします。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <div className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800">
                ご入力のメールアドレス宛に、パスワード再設定リンクをお送りしました。
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
                <br />
                <br />
                ※ ご登録のないメールアドレスをご入力された場合、メールは送信されません。
                心当たりがない場合は、お手数ですが正しいメールアドレスで再度お試しください。
              </div>
              <div className="text-center text-sm">
                <Link
                  href="/login"
                  className="font-medium text-brand-teal hover:text-brand-teal/80"
                >
                  ログイン画面に戻る
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="taro@example.com"
                  autoComplete="email"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
                disabled={isSubmitting}
              >
                {isSubmitting ? '送信中...' : '再設定リンクを送信'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="font-medium text-brand-teal hover:text-brand-teal/80"
                >
                  ログイン画面に戻る
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
