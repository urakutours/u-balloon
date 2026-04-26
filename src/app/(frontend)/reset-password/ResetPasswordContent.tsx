'use client'

import React, { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TOKEN_STORAGE_KEY = 'uballoon-auth-token'

type ResetSuccessResponse = {
  token?: string
  user?: {
    id: string
    email: string
    legacyData?: { requirePasswordChange?: boolean } | null
  }
}

export default function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password: newPassword }),
      })

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error(
            'リンクの有効期限が切れているか、無効です。再度パスワード再設定をお申し込みください。',
          )
        }
        const data = await res.json().catch(() => ({}))
        throw new Error(data.errors?.[0]?.message || 'パスワード再設定に失敗しました')
      }

      const data = (await res.json()) as ResetSuccessResponse

      // Auto-login: persist the JWT so AuthContext picks it up after reload.
      if (data.token) {
        try {
          window.localStorage.setItem(TOKEN_STORAGE_KEY, data.token)
        } catch {
          // private mode / quota exceeded — proceed anyway, user can log in manually
        }
      }

      // Migrated members carry legacyData.requirePasswordChange: true.
      // Clear it now so they don't get bounced to /change-password on next login.
      let flagClearFailed = false
      if (data.user?.id && data.user.legacyData?.requirePasswordChange && data.token) {
        try {
          const patchRes = await fetch(`/api/users/${data.user.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `JWT ${data.token}`,
            },
            body: JSON.stringify({
              legacyData: {
                ...(typeof data.user.legacyData === 'object' ? data.user.legacyData : {}),
                requirePasswordChange: false,
                passwordChangedAt: new Date().toISOString(),
              },
            }),
          })
          if (!patchRes.ok) {
            flagClearFailed = true
            console.warn(
              'reset-password: failed to clear legacyData.requirePasswordChange',
              patchRes.status,
            )
          }
        } catch (patchErr) {
          flagClearFailed = true
          console.warn('reset-password: legacyData PATCH threw', patchErr)
        }
      }

      // Full reload so AuthProvider re-reads localStorage and rehydrates state.
      // If the legacyData flag clear failed, the user will be re-routed to
      // /change-password by LoginContent on next login, which is acceptable
      // (they can change the password again, then it will succeed).
      window.location.href = flagClearFailed ? '/change-password' : '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'パスワード再設定に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!token) {
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
            <CardTitle className="text-2xl">無効なリンクです</CardTitle>
            <CardDescription>
              パスワード再設定リンクが無効です。お手数ですが、再度お申し込みください。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/forgot-password"
              className="block text-center font-medium text-brand-teal hover:text-brand-teal/80"
            >
              パスワード再設定をやり直す
            </Link>
          </CardContent>
        </Card>
      </div>
    )
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
          <CardTitle className="text-2xl">新しいパスワードを設定</CardTitle>
          <CardDescription>
            新しいパスワードを入力して、再設定を完了してください。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <p>{error}</p>
                {error.includes('有効期限') && (
                  <Link
                    href="/forgot-password"
                    className="block font-medium text-brand-teal hover:text-brand-teal/80"
                  >
                    パスワード再設定をやり直す
                  </Link>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="8文字以上"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-brand-dark hover:bg-brand-dark/90 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? '設定中...' : 'パスワードを再設定する'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
