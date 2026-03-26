'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const passwordConfirm = formData.get('passwordConfirm') as string
    const phone = formData.get('phone') as string
    const defaultAddress = formData.get('defaultAddress') as string

    if (!name || !email || !password) {
      setError('氏名、メールアドレス、パスワードは必須です')
      setIsSubmitting(false)
      return
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください')
      setIsSubmitting(false)
      return
    }

    if (password !== passwordConfirm) {
      setError('パスワードが一致しません')
      setIsSubmitting(false)
      return
    }

    try {
      await register({ email, password, name, phone, defaultAddress })
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <Card className="w-full rounded-xl border">
        <CardHeader>
          <Image src="/logo.svg" alt="uballoon" width={120} height={34} className="mx-auto mb-4 h-8 w-auto" />
          <CardTitle className="text-2xl">会員登録</CardTitle>
          <CardDescription>新しいアカウントを作成します</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">氏名 *</Label>
              <Input id="name" name="name" required placeholder="山田 太郎" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input id="email" name="email" type="email" required placeholder="taro@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード *</Label>
              <Input id="password" name="password" type="password" required minLength={8} placeholder="8文字以上" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">パスワード（確認） *</Label>
              <Input id="passwordConfirm" name="passwordConfirm" type="password" required minLength={8} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input id="phone" name="phone" type="tel" placeholder="090-1234-5678" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultAddress">住所（任意）</Label>
              <Input id="defaultAddress" name="defaultAddress" placeholder="東京都渋谷区..." />
            </div>

            <Button type="submit" className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={isSubmitting}>
              {isSubmitting ? '登録中...' : '会員登録'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              すでにアカウントをお持ちですか？{' '}
              <Link href="/login" className="font-medium text-brand-teal hover:text-brand-teal/80">
                ログイン
              </Link>
            </p>

            <p className="text-center text-xs text-muted-foreground">
              登録することで、<Link href="/terms" className="underline hover:text-foreground">利用規約</Link>と<Link href="/privacy" className="underline hover:text-foreground">プライバシーポリシー</Link>に同意したものとみなされます。
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
