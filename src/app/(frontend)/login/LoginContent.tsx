'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/'

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
      await login(email, password)
      const meRes = await fetch('/api/users/me', { credentials: 'include' })
      if (meRes.ok) {
        const meData = await meRes.json()
        if (meData.user?.legacyData?.requirePasswordChange) {
          router.push(`/change-password?redirect=${encodeURIComponent(redirectTo)}`)
          return
        }
      }
      router.push(redirectTo)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
      <Card className="w-full rounded-xl border">
        <CardHeader>
          <Image src="/logo.svg" alt="uballoon" width={120} height={34} className="mx-auto mb-4 h-8 w-auto" />
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>メールアドレスとパスワードでログインします</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input id="email" name="email" type="email" required placeholder="taro@example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white" disabled={isSubmitting}>
              {isSubmitting ? 'ログイン中...' : 'ログイン'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              アカウントをお持ちでないですか？{' '}
              <Link href="/register" className="font-medium text-brand-teal hover:text-brand-teal/80">
                会員登録
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
