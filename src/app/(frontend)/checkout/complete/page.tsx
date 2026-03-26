import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle } from 'lucide-react'

export default function CheckoutCompletePage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <Card>
        <CardContent className="p-8">
          <CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold text-brand-teal">ご注文ありがとうございます</h1>
          <p className="mb-6 text-muted-foreground">
            注文が正常に作成されました。
            <br />
            確認メールをお送りしますのでご確認ください。
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/account">
              <Button variant="outline">注文履歴を確認</Button>
            </Link>
            <Link href="/products">
              <Button>買い物を続ける</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
