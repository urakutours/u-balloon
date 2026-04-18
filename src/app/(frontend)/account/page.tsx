'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PREFECTURES = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
]

type PointTransaction = {
  id: string
  type: string
  amount: number
  balance: number
  description: string
  createdAt: string
  expiresAt?: string
}

type Order = {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
}

const statusLabels: Record<string, string> = {
  pending: '保留中',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

const pointTypeLabels: Record<string, string> = {
  earn: '付与',
  use: '使用',
  adjust: '手動調整',
  expire: '失効',
  migration: '移行',
}

export default function AccountPage() {
  const router = useRouter()
  const { user, isLoading, refreshUser } = useAuth()
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([])
  const [pointPage, setPointPage] = useState(1)
  const [pointTotalPages, setPointTotalPages] = useState(1)
  const [orders, setOrders] = useState<Order[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [prefecture, setPrefecture] = useState('')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/account')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      fetchPointHistory(1)
      fetchOrders()
    }
  }, [user])

  const fetchPointHistory = async (page: number) => {
    try {
      const res = await fetch(
        `/api/point-transactions?where[user][equals]=${user!.id}&sort=-createdAt&limit=10&page=${page}`,
        { credentials: 'include' },
      )
      if (res.ok) {
        const data = await res.json()
        setPointHistory(data.docs || [])
        setPointPage(data.page || 1)
        setPointTotalPages(data.totalPages || 1)
      }
    } catch {
      // silently fail
    }
  }

  const fetchOrders = async () => {
    try {
      const res = await fetch(
        `/api/orders?where[customer][equals]=${user!.id}&sort=-createdAt&limit=10`,
        { credentials: 'include' },
      )
      if (res.ok) {
        const data = await res.json()
        setOrders(data.docs || [])
      }
    } catch {
      // silently fail
    }
  }

  const handleEditStart = () => {
    setPrefecture(user?.prefecture || '')
    setEditError('')
    setIsEditing(true)
  }

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEditError('')
    setIsSaving(true)

    const formData = new FormData(e.currentTarget)
    const email = ((formData.get('email') as string | null) ?? '').trim()
    const postalCode = (formData.get('postalCode') as string | null) ?? ''
    const addressLine1 = (formData.get('addressLine1') as string | null) ?? ''
    const addressLine2 = (formData.get('addressLine2') as string | null) ?? ''
    const defaultAddress = [prefecture, addressLine1, addressLine2]
      .filter(Boolean)
      .join(' ')

    if (!email) {
      setEditError('メールアドレスを入力してください')
      setIsSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          name: formData.get('name'),
          nameKana: formData.get('nameKana'),
          phone: formData.get('phone'),
          mobilePhone: formData.get('mobilePhone'),
          postalCode,
          prefecture,
          addressLine1,
          addressLine2,
          defaultAddress,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg =
          data?.errors?.[0]?.message ||
          data?.message ||
          '更新に失敗しました'
        throw new Error(msg)
      }

      await refreshUser()
      setIsEditing(false)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-brand-dark transition-colors">ホーム</Link>
        <span className="mx-1.5">&gt;</span>
        <span className="text-foreground">マイページ</span>
      </nav>

      <h1 className="mb-6 text-2xl font-bold text-brand-teal">マイページ</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="data-[state=active]:text-brand-dark data-[state=active]:border-brand-teal">プロフィール</TabsTrigger>
          <TabsTrigger value="points" className="data-[state=active]:text-brand-dark data-[state=active]:border-brand-teal">ポイント</TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:text-brand-dark data-[state=active]:border-brand-teal">注文履歴</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>プロフィール情報</CardTitle>
                <CardDescription>登録情報の確認・編集</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" className="border-brand-teal text-brand-teal hover:bg-brand-teal/5" onClick={handleEditStart}>
                  編集
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  {editError && (
                    <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      {editError}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="editName">氏名</Label>
                    <Input id="editName" name="name" defaultValue={user.name || ''} placeholder="山田 太郎" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editNameKana">フリガナ</Label>
                    <Input id="editNameKana" name="nameKana" defaultValue={user.nameKana || ''} placeholder="ヤマダ タロウ" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">メールアドレス</Label>
                    <Input
                      id="editEmail"
                      name="email"
                      type="email"
                      defaultValue={user.email}
                      required
                      autoComplete="email"
                    />
                    <p className="text-xs text-muted-foreground">
                      変更するとログイン用メールアドレスも更新されます。
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">電話番号</Label>
                    <Input id="editPhone" name="phone" defaultValue={user.phone || ''} placeholder="09012345678" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editMobilePhone">携帯電話番号</Label>
                    <Input id="editMobilePhone" name="mobilePhone" defaultValue={user.mobilePhone || ''} placeholder="電話番号と同じ場合は空欄" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPostalCode">郵便番号</Label>
                    <Input id="editPostalCode" name="postalCode" defaultValue={user.postalCode || ''} placeholder="1234567" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPrefecture">都道府県</Label>
                    <Select value={prefecture} onValueChange={(v) => setPrefecture(v ?? '')}>
                      <SelectTrigger id="editPrefecture">
                        <SelectValue placeholder="都道府県を選択..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PREFECTURES.map((pref) => (
                          <SelectItem key={pref} value={pref}>
                            {pref}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressLine1">市区町村・番地</Label>
                    <Input id="editAddressLine1" name="addressLine1" defaultValue={user.addressLine1 || ''} placeholder="渋谷区渋谷 1-2-3" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editAddressLine2">建物名・部屋番号</Label>
                    <Input id="editAddressLine2" name="addressLine2" defaultValue={user.addressLine2 || ''} placeholder="○○ビル 101" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSaving} className="bg-brand-dark hover:bg-brand-dark/90">
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                      キャンセル
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">氏名</span>
                    <p className="font-medium">{user.name || '未設定'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">フリガナ</span>
                    <p className="font-medium">{user.nameKana || '未設定'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">メールアドレス</span>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">電話番号</span>
                    <p className="font-medium">{user.phone || '未設定'}</p>
                  </div>
                  {user.mobilePhone && (
                    <div>
                      <span className="text-sm text-muted-foreground">携帯電話番号</span>
                      <p className="font-medium">{user.mobilePhone}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">郵便番号</span>
                    <p className="font-medium">{user.postalCode || '未設定'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">住所</span>
                    <p className="font-medium">
                      {[user.prefecture, user.addressLine1, user.addressLine2]
                        .filter(Boolean)
                        .join(' ') || user.defaultAddress || '未設定'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Points Tab */}
        <TabsContent value="points">
          <Card className="mb-6 bg-brand-pink-light">
            <CardHeader>
              <CardTitle>ポイント残高</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-brand-pink">{user.points.toLocaleString()} <span className="text-base font-normal text-brand-pink">pt</span></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ポイント履歴</CardTitle>
            </CardHeader>
            <CardContent>
              {pointHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">ポイント履歴はまだありません</p>
              ) : (
                <div className="space-y-3">
                  {pointHistory.map((tx) => (
                    <div key={tx.id}>
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant={tx.amount >= 0 ? 'default' : 'destructive'} className={`mr-2 ${tx.type === 'earn' ? 'bg-brand-teal text-white hover:bg-brand-teal/90' : ''}`}>
                            {pointTypeLabels[tx.type] || tx.type}
                          </Badge>
                          <span className="text-sm">{tx.description}</span>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${tx.amount >= 0 ? 'text-brand-teal' : 'text-red-600'}`}>
                            {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()} pt
                          </p>
                          <p className="text-xs text-muted-foreground">残高: {tx.balance.toLocaleString()} pt</p>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString('ja-JP')}
                        {tx.expiresAt && ` | 有効期限: ${new Date(tx.expiresAt).toLocaleDateString('ja-JP')}`}
                      </p>
                      <Separator className="mt-3" />
                    </div>
                  ))}
                </div>
              )}

              {pointTotalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pointPage <= 1}
                    onClick={() => fetchPointHistory(pointPage - 1)}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {pointPage} / {pointTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pointPage >= pointTotalPages}
                    onClick={() => fetchPointHistory(pointPage + 1)}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>注文履歴</CardTitle>
              <CardDescription>直近10件</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">注文履歴はまだありません</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id}>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="flex items-center justify-between rounded-md p-2 -mx-2 transition-colors hover:bg-brand-pink-light/50"
                      >
                        <div>
                          <p className="font-medium">{order.orderNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          <p className="mt-1 font-medium">¥{order.totalAmount.toLocaleString()}</p>
                        </div>
                      </Link>
                      <Separator className="mt-3" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
