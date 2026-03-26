import React from 'react'
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
} from '@react-email/components'

// Common layout wrapper
function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <Html lang="ja">
      <Head />
      <Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
        <Container style={{ backgroundColor: '#ffffff', margin: '40px auto', padding: '20px 48px', borderRadius: '8px', maxWidth: '600px' }}>
          <Heading as="h2" style={{ color: '#333', textAlign: 'center' as const }}>
            🎈 uballoon
          </Heading>
          <Hr style={{ borderColor: '#e6ebf1', margin: '20px 0' }} />
          {children}
          <Hr style={{ borderColor: '#e6ebf1', margin: '20px 0' }} />
          <Text style={{ color: '#8898aa', fontSize: '12px', textAlign: 'center' as const }}>
            uballoon - バルーンギフトEC
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

// 1. 会員登録完了メール
export function WelcomeEmail({ name }: { name: string }) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        会員登録完了のお知らせ
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様
      </Text>
      <Text style={{ color: '#525f7f' }}>
        uballoonへの会員登録が完了しました。
      </Text>
      <Text style={{ color: '#525f7f' }}>
        当店では特別なバルーンギフトを取り扱っております。
        ぜひお好みの商品をお探しください。
      </Text>
      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px' }}>
        <Text style={{ color: '#525f7f', margin: 0 }}>
          ログインしてお買い物を始めましょう！
        </Text>
      </Section>
    </EmailLayout>
  )
}

// 2. 注文確認メール
type OrderConfirmEmailProps = {
  name: string
  orderNumber: string
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
  }>
  deliveryAddress?: string
  desiredArrivalDate?: string
  subtotal: number
  shippingFee: number
  pointsUsed: number
  totalAmount: number
}

export function OrderConfirmEmail({
  name,
  orderNumber,
  items,
  deliveryAddress,
  desiredArrivalDate,
  subtotal,
  shippingFee,
  pointsUsed,
  totalAmount,
}: OrderConfirmEmailProps) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        ご注文確認
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様、ご注文ありがとうございます。
      </Text>
      <Text style={{ color: '#525f7f', fontWeight: 'bold' }}>
        注文番号: {orderNumber}
      </Text>

      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px' }}>
        <Text style={{ color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>ご注文内容</Text>
        {items.map((item, i) => (
          <Text key={i} style={{ color: '#525f7f', margin: '4px 0' }}>
            {item.productName} × {item.quantity} — ¥{(item.unitPrice * item.quantity).toLocaleString()}
          </Text>
        ))}
        <Hr style={{ borderColor: '#ddd', margin: '12px 0' }} />
        <Text style={{ color: '#525f7f', margin: '4px 0' }}>商品小計: ¥{subtotal.toLocaleString()}</Text>
        <Text style={{ color: '#525f7f', margin: '4px 0' }}>送料: ¥{shippingFee.toLocaleString()}</Text>
        {pointsUsed > 0 && (
          <Text style={{ color: '#525f7f', margin: '4px 0' }}>ポイント使用: -{pointsUsed.toLocaleString()} pt</Text>
        )}
        <Text style={{ color: '#333', fontWeight: 'bold', margin: '8px 0 0' }}>
          合計: ¥{totalAmount.toLocaleString()}
        </Text>
      </Section>

      {deliveryAddress && (
        <Section>
          <Text style={{ color: '#333', fontWeight: 'bold' }}>配送先</Text>
          <Text style={{ color: '#525f7f' }}>{deliveryAddress}</Text>
        </Section>
      )}
      {desiredArrivalDate && (
        <Section>
          <Text style={{ color: '#333', fontWeight: 'bold' }}>到着希望日</Text>
          <Text style={{ color: '#525f7f' }}>{desiredArrivalDate}</Text>
        </Section>
      )}
    </EmailLayout>
  )
}

// 3. 注文ステータス更新メール
const statusLabels: Record<string, string> = {
  pending: '保留中',
  confirmed: '確認済み',
  preparing: '準備中',
  shipped: '発送済み',
  delivered: '配達完了',
  cancelled: 'キャンセル',
}

export function OrderStatusUpdateEmail({
  name,
  orderNumber,
  newStatus,
}: {
  name: string
  orderNumber: string
  newStatus: string
}) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        ご注文ステータス更新
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様
      </Text>
      <Text style={{ color: '#525f7f' }}>
        ご注文 {orderNumber} のステータスが更新されました。
      </Text>
      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px', textAlign: 'center' as const }}>
        <Text style={{ color: '#333', fontWeight: 'bold', fontSize: '18px' }}>
          {statusLabels[newStatus] || newStatus}
        </Text>
      </Section>
      {newStatus === 'shipped' && (
        <Text style={{ color: '#525f7f' }}>
          商品を発送いたしました。到着までお待ちください。
        </Text>
      )}
      {newStatus === 'delivered' && (
        <Text style={{ color: '#525f7f' }}>
          商品が配達されました。お受け取りありがとうございます。
        </Text>
      )}
      {newStatus === 'cancelled' && (
        <Text style={{ color: '#525f7f' }}>
          ご注文がキャンセルされました。ご不明な点がございましたらお問い合わせください。
        </Text>
      )}
    </EmailLayout>
  )
}

// 4. ポイント付与通知メール
export function PointsEarnedEmail({
  name,
  pointsEarned,
  newBalance,
  orderNumber,
}: {
  name: string
  pointsEarned: number
  newBalance: number
  orderNumber: string
}) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        ポイント付与のお知らせ
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様
      </Text>
      <Text style={{ color: '#525f7f' }}>
        ご注文 {orderNumber} のポイントが付与されました。
      </Text>
      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px', textAlign: 'center' as const }}>
        <Text style={{ color: '#333', fontWeight: 'bold', fontSize: '24px', margin: '0' }}>
          +{pointsEarned.toLocaleString()} pt
        </Text>
        <Text style={{ color: '#8898aa', fontSize: '14px' }}>
          現在の保有ポイント: {newBalance.toLocaleString()} pt
        </Text>
      </Section>
      <Text style={{ color: '#525f7f' }}>
        ポイントは次回以降のお買い物でご利用いただけます（1pt = 1円）。
        有効期限は付与日から1年間です。
      </Text>
    </EmailLayout>
  )
}
