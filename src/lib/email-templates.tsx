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
import { formatTimeSlot, formatCarrier, formatPaymentMethod } from './order-display-helpers'

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
export type SenderInfo = {
  senderName?: string
  senderEmail?: string
  senderPhone?: string
  senderPostalCode?: string
  senderPrefecture?: string
  senderAddressLine1?: string
  senderAddressLine2?: string
}

export type RecipientInfo = {
  recipientSameAsSender?: boolean
  recipientName?: string
  recipientNameKana?: string
  recipientPhone?: string
  recipientPostalCode?: string
  recipientPrefecture?: string
  recipientAddressLine1?: string
  recipientAddressLine2?: string
  recipientDesiredArrivalDate?: string
  recipientDesiredTimeSlotLabel?: string
}

export type GiftInfo = {
  giftWrappingOptionName?: string
  giftWrappingFee?: number
  giftMessageCardText?: string
}

export type UsageInfo = {
  usageEventName?: string
  usageDate?: string
  usageTimeText?: string
}

export type OrderConfirmEmailProps = {
  name: string
  email?: string
  orderNumber: string
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
  }>
  deliveryAddress?: string
  desiredArrivalDate?: string
  desiredTimeSlot?: string
  receivedAt?: string
  shippingCarrier?: string
  eventName?: string
  eventDateTime?: string
  notes?: string
  subtotal: number
  shippingFee: number
  pointsUsed: number
  totalAmount: number
  shippingPlanName?: string
  scheduledShipDate?: string
  paymentMethod?: 'stripe' | 'bank_transfer' | 'credit_card' | string
  cardLast4?: string
  bankInfo?: {
    bankName?: string | null
    branchName?: string | null
    accountType?: string | null
    accountNumber?: string | null
    accountHolder?: string | null
  }
  bankTransferDeadline?: string
  /** 注文者情報（旧称: 送り主情報）。内部 prop 名は senderInfo のまま */
  senderInfo?: SenderInfo
  /** 送り先情報（新フォーム対応） */
  recipientInfo?: RecipientInfo
  /** ギフト設定（新フォーム対応） */
  giftInfo?: GiftInfo
  /** 使用日時情報（新フォーム対応） */
  usageInfo?: UsageInfo
  /** DB から取得したブロックテキスト。キーが無い場合はコード内デフォルト文言にフォールバック */
  blocks?: Record<string, string>
}

function formatAccountType(type: string | null | undefined): string {
  if (!type) return '-'
  if (type === 'checking') return '当座'
  if (type === 'ordinary' || type === 'savings' || type === 'normal') return '普通'
  return type
}

export function OrderConfirmEmail({
  name,
  email,
  orderNumber,
  items,
  deliveryAddress,
  desiredArrivalDate,
  desiredTimeSlot,
  receivedAt,
  shippingCarrier,
  eventName,
  eventDateTime,
  notes,
  subtotal,
  shippingFee,
  pointsUsed,
  totalAmount,
  shippingPlanName,
  scheduledShipDate,
  paymentMethod,
  cardLast4,
  bankInfo,
  bankTransferDeadline,
  senderInfo,
  recipientInfo,
  giftInfo,
  usageInfo,
  blocks = {},
}: OrderConfirmEmailProps) {
  const greeting = blocks['greeting'] ?? `${name} 様、ご注文ありがとうございます。`
  const intro = blocks['intro'] ?? '以下の内容でご注文を承りました。内容をご確認ください。'
  const bankTransferLead =
    blocks['bank_transfer_lead'] ??
    '以下の口座までお振込みをお願いいたします。期限までにご入金が確認できない場合、ご注文はキャンセルとなります。'
  const thanksMessage = blocks['thanks_message'] ?? 'この度はご注文いただきありがとうございました。'
  const footerNote =
    blocks['footer_note'] ??
    'ご不明な点はお問い合わせページよりお気軽にご連絡ください。\nuballoon - バルーンギフトEC'
  const labelStyle = { color: '#333', fontWeight: 'bold' as const, margin: '0 0 2px' }
  const valueStyle = { color: '#525f7f', margin: '0 0 4px' }
  const bankBoxStyle = {
    backgroundColor: '#fffbeb',
    border: '1px solid #f59e0b',
    borderRadius: '4px',
    padding: '16px',
    marginTop: '16px',
  }
  const sectionHeadingStyle = { color: '#92400e', fontSize: '14px', margin: '0 0 12px', fontWeight: 'bold' as const }
  const deadlineStyle = { color: '#dc2626', fontWeight: 'bold' as const, margin: '12px 0 4px' }
  const noteStyle = { color: '#6b7280', fontSize: '12px', margin: '8px 0 0' }
  const infoSectionStyle = { backgroundColor: '#f8f9fa', padding: '12px 16px', borderRadius: '4px', marginBottom: '12px' }
  const infoHeadingStyle = { color: '#333', fontWeight: 'bold' as const, margin: '0 0 8px', fontSize: '13px' }

  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        ご注文確認
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {greeting}
      </Text>
      <Text style={{ color: '#525f7f' }}>
        {intro}
      </Text>
      <Text style={{ color: '#525f7f', fontWeight: 'bold' }}>
        注文番号: {orderNumber}
      </Text>
      {receivedAt && (
        <Text style={{ color: '#8898aa', fontSize: '12px', margin: '0 0 16px' }}>
          受付日時: {receivedAt}
        </Text>
      )}

      {/* 注文者情報（旧称: 送り主情報） */}
      <Section style={infoSectionStyle}>
        <Text style={infoHeadingStyle}>注文者情報</Text>
        {senderInfo && (senderInfo.senderName || senderInfo.senderEmail || senderInfo.senderPhone) ? (
          <>
            {senderInfo.senderName && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{senderInfo.senderName}</Text>}
            {senderInfo.senderPhone && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{senderInfo.senderPhone}</Text>}
            {senderInfo.senderEmail && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{senderInfo.senderEmail}</Text>}
            {(senderInfo.senderPostalCode || senderInfo.senderPrefecture || senderInfo.senderAddressLine1) && (
              <Text style={{ ...valueStyle, margin: 0 }}>
                {[
                  senderInfo.senderPostalCode ? `〒${senderInfo.senderPostalCode}` : '',
                  senderInfo.senderPrefecture,
                  senderInfo.senderAddressLine1,
                  senderInfo.senderAddressLine2,
                ].filter(Boolean).join(' ')}
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{name}</Text>
            {email && <Text style={{ ...valueStyle, margin: 0 }}>{email}</Text>}
          </>
        )}
      </Section>

      {/* 送り先情報（新フォーム対応） */}
      {recipientInfo && (recipientInfo.recipientSameAsSender !== undefined || recipientInfo.recipientName) && (
        <Section style={{ ...infoSectionStyle, marginTop: '12px' }}>
          <Text style={infoHeadingStyle}>送り先情報</Text>
          {recipientInfo.recipientSameAsSender ? (
            <Text style={{ ...valueStyle, margin: 0 }}>注文者と同じ</Text>
          ) : (
            <>
              {recipientInfo.recipientName && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{recipientInfo.recipientName}</Text>}
              {recipientInfo.recipientPhone && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{recipientInfo.recipientPhone}</Text>}
              {(recipientInfo.recipientPostalCode || recipientInfo.recipientPrefecture || recipientInfo.recipientAddressLine1) && (
                <Text style={{ ...valueStyle, margin: '0 0 2px' }}>
                  {[
                    recipientInfo.recipientPostalCode ? `〒${recipientInfo.recipientPostalCode}` : '',
                    recipientInfo.recipientPrefecture,
                    recipientInfo.recipientAddressLine1,
                    recipientInfo.recipientAddressLine2,
                  ].filter(Boolean).join(' ')}
                </Text>
              )}
              {recipientInfo.recipientDesiredArrivalDate && (
                <Text style={{ ...valueStyle, margin: '0 0 2px' }}>
                  到着希望日: {new Date(recipientInfo.recipientDesiredArrivalDate).toLocaleDateString('ja-JP')}
                  {recipientInfo.recipientDesiredTimeSlotLabel && `（${recipientInfo.recipientDesiredTimeSlotLabel}）`}
                </Text>
              )}
            </>
          )}
        </Section>
      )}

      {/* ギフト設定（新フォーム対応） */}
      {giftInfo && giftInfo.giftWrappingOptionName && (
        <Section style={{ ...infoSectionStyle, marginTop: '12px' }}>
          <Text style={infoHeadingStyle}>ギフト設定</Text>
          <Text style={{ ...valueStyle, margin: '0 0 2px' }}>
            ラッピング: {giftInfo.giftWrappingOptionName}
            {giftInfo.giftWrappingFee ? ` (+¥${giftInfo.giftWrappingFee.toLocaleString()})` : ''}
          </Text>
          {giftInfo.giftMessageCardText && (
            <Text style={{ ...valueStyle, margin: 0, whiteSpace: 'pre-wrap' as const }}>
              メッセージ: {giftInfo.giftMessageCardText}
            </Text>
          )}
        </Section>
      )}

      {/* 使用日時（新フォーム対応） */}
      {usageInfo && (usageInfo.usageDate || usageInfo.usageEventName) && (
        <Section style={{ ...infoSectionStyle, marginTop: '12px' }}>
          <Text style={infoHeadingStyle}>使用日時</Text>
          {usageInfo.usageEventName && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{usageInfo.usageEventName}</Text>}
          {usageInfo.usageDate && (
            <Text style={{ ...valueStyle, margin: 0 }}>
              {new Date(usageInfo.usageDate).toLocaleDateString('ja-JP')}
              {usageInfo.usageTimeText && ` ${usageInfo.usageTimeText}`}
            </Text>
          )}
        </Section>
      )}

      {/* お支払い方法 */}
      <Section style={infoSectionStyle}>
        <Text style={infoHeadingStyle}>お支払い方法</Text>
        <Text style={{ ...valueStyle, margin: 0 }}>
          {formatPaymentMethod(paymentMethod, cardLast4)}
        </Text>
      </Section>

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
          <Text style={{ color: '#525f7f' }}>
            {desiredArrivalDate}
            {desiredTimeSlot && `（${formatTimeSlot(desiredTimeSlot)}）`}
          </Text>
        </Section>
      )}
      {!desiredArrivalDate && desiredTimeSlot && (
        <Section>
          <Text style={{ color: '#333', fontWeight: 'bold' }}>希望時間帯</Text>
          <Text style={{ color: '#525f7f' }}>{formatTimeSlot(desiredTimeSlot)}</Text>
        </Section>
      )}
      {shippingPlanName && (
        <Section style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>配送方法</Text>
          <Text style={valueStyle}>{shippingPlanName}</Text>
        </Section>
      )}
      {shippingCarrier && (
        <Section style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>配送業者</Text>
          <Text style={valueStyle}>{formatCarrier(shippingCarrier)}</Text>
        </Section>
      )}
      {scheduledShipDate && (
        <Section style={{ marginBottom: 8 }}>
          <Text style={labelStyle}>発送予定日</Text>
          <Text style={valueStyle}>
            {new Date(scheduledShipDate).toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })}
          </Text>
        </Section>
      )}

      {(eventName || eventDateTime) && (
        <Section style={{ ...infoSectionStyle, marginTop: '12px' }}>
          <Text style={infoHeadingStyle}>イベント情報</Text>
          {eventName && <Text style={{ ...valueStyle, margin: '0 0 2px' }}>{eventName}</Text>}
          {eventDateTime && <Text style={{ ...valueStyle, margin: 0 }}>{eventDateTime}</Text>}
        </Section>
      )}

      {notes && (
        <Section style={{ ...infoSectionStyle, marginTop: '12px' }}>
          <Text style={infoHeadingStyle}>備考</Text>
          <Text style={{ ...valueStyle, margin: 0, whiteSpace: 'pre-wrap' as const }}>{notes}</Text>
        </Section>
      )}

      {paymentMethod === 'bank_transfer' && bankInfo && (
        <Section style={bankBoxStyle}>
          <Text style={{ color: '#92400e', fontSize: '14px', margin: '0 0 12px' }}>
            {bankTransferLead}
          </Text>
          <Heading as="h3" style={sectionHeadingStyle}>お振込先</Heading>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr><td style={labelStyle}>銀行名</td><td style={valueStyle}>{bankInfo.bankName ?? '-'}</td></tr>
              <tr><td style={labelStyle}>支店名</td><td style={valueStyle}>{bankInfo.branchName ?? '-'}</td></tr>
              <tr><td style={labelStyle}>口座種別</td><td style={valueStyle}>{formatAccountType(bankInfo.accountType)}</td></tr>
              <tr><td style={labelStyle}>口座番号</td><td style={valueStyle}>{bankInfo.accountNumber ?? '-'}</td></tr>
              <tr><td style={labelStyle}>口座名義</td><td style={valueStyle}>{bankInfo.accountHolder ?? '-'}</td></tr>
            </tbody>
          </table>

          {bankTransferDeadline && (
            <Text style={deadlineStyle}>
              お振込期限: <strong>
                {new Date(bankTransferDeadline).toLocaleDateString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
                })}
              </strong>
              {scheduledShipDate && (
                <span style={{ color: '#64748b', fontSize: 12, display: 'block' }}>
                  （発送予定日 {new Date(scheduledShipDate).toLocaleDateString('ja-JP')} の前までにお振込ください）
                </span>
              )}
            </Text>
          )}

          <Text style={noteStyle}>
            ※お振込手数料はお客様負担となります。期日までにご入金が確認できない場合、注文はキャンセルされます。
          </Text>
        </Section>
      )}

      <Text style={{ color: '#525f7f', marginTop: '16px' }}>
        {thanksMessage}
      </Text>
      <Text style={{ color: '#8898aa', fontSize: '12px', whiteSpace: 'pre-wrap' as const }}>
        {footerNote}
      </Text>
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
  scheduledShipDate,
}: {
  name: string
  orderNumber: string
  newStatus: string
  scheduledShipDate?: string
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
      {scheduledShipDate && ['confirmed', 'preparing'].includes(newStatus) && (
        <Text style={{ color: '#525f7f' }}>
          発送予定日: {new Date(scheduledShipDate).toLocaleDateString('ja-JP')}
        </Text>
      )}
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

// 4. フォーム送信通知メール
type FormNotificationEmailProps = {
  formTitle: string
  fields: Array<{ name: string; label: string }>
  data: Record<string, unknown>
}

export function FormNotificationEmail({ formTitle, fields, data }: FormNotificationEmailProps) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        {formTitle} - 新しい送信
      </Heading>
      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px' }}>
        {fields.map((field) => (
          <div key={field.name}>
            <Text style={{ color: '#333', fontWeight: 'bold', margin: '8px 0 2px' }}>
              {field.label}
            </Text>
            <Text style={{ color: '#525f7f', margin: '0 0 8px' }}>
              {String(data[field.name] ?? '(未入力)')}
            </Text>
          </div>
        ))}
      </Section>
      <Text style={{ color: '#8898aa', fontSize: '12px' }}>
        このメールはuballoonのフォームから自動送信されました。
      </Text>
    </EmailLayout>
  )
}

// 5. ポイント付与通知メール
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

// 6. 管理者アラートメール
export function AdminAlertEmail({
  alertType,
  title,
  details,
  urgency = 'normal',
}: {
  alertType: string
  title: string
  details: string
  urgency?: 'normal' | 'high'
}) {
  const borderColor = urgency === 'high' ? '#e53e3e' : '#ed8936'
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        {alertType}
      </Heading>
      <Section style={{ borderLeft: `4px solid ${borderColor}`, padding: '12px 16px', backgroundColor: '#f7fafc', borderRadius: '4px' }}>
        <Text style={{ color: '#333', fontWeight: 'bold', margin: '0 0 8px' }}>
          {title}
        </Text>
        <Text style={{ color: '#525f7f', margin: 0, whiteSpace: 'pre-wrap' as const }}>
          {details}
        </Text>
      </Section>
      <Text style={{ color: '#8898aa', fontSize: '12px', marginTop: '16px' }}>
        このメールはuballoon管理システムから自動送信されました。
      </Text>
    </EmailLayout>
  )
}

// 7. 発送通知メール（追跡情報付き）
export function ShippingNotificationEmail({
  name,
  orderNumber,
  carrier,
  trackingNumber,
  trackingUrl,
}: {
  name: string
  orderNumber: string
  carrier: string
  trackingNumber: string
  trackingUrl?: string
}) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        発送のお知らせ
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様
      </Text>
      <Text style={{ color: '#525f7f' }}>
        ご注文 {orderNumber} を発送いたしました。
      </Text>
      <Section style={{ backgroundColor: '#f0f4f8', padding: '16px', borderRadius: '4px' }}>
        <Text style={{ color: '#333', fontWeight: 'bold', margin: '0 0 4px' }}>配送業者</Text>
        <Text style={{ color: '#525f7f', margin: '0 0 12px' }}>{carrier}</Text>
        <Text style={{ color: '#333', fontWeight: 'bold', margin: '0 0 4px' }}>追跡番号</Text>
        <Text style={{ color: '#525f7f', margin: '0' }}>{trackingNumber}</Text>
      </Section>
      {trackingUrl && (
        <Section style={{ textAlign: 'center' as const, marginTop: '16px' }}>
          <a
            href={trackingUrl}
            style={{ backgroundColor: '#e91e8c', color: '#fff', padding: '12px 24px', borderRadius: '24px', textDecoration: 'none', fontWeight: 'bold' }}
          >
            配送状況を確認する
          </a>
        </Section>
      )}
    </EmailLayout>
  )
}

// 8. 遅延通知メール
export function DelayNotificationEmail({
  name,
  orderNumber,
  reason,
  newEstimate,
}: {
  name: string
  orderNumber: string
  reason: string
  newEstimate?: string
}) {
  return (
    <EmailLayout>
      <Heading as="h3" style={{ color: '#333' }}>
        配送遅延のお知らせ
      </Heading>
      <Text style={{ color: '#525f7f' }}>
        {name} 様
      </Text>
      <Text style={{ color: '#525f7f' }}>
        ご注文 {orderNumber} につきまして、配送に遅延が発生しております。
        ご迷惑をおかけし大変申し訳ございません。
      </Text>
      <Section style={{ backgroundColor: '#fff5f5', padding: '16px', borderRadius: '4px', borderLeft: '4px solid #e53e3e' }}>
        <Text style={{ color: '#333', fontWeight: 'bold', margin: '0 0 4px' }}>遅延理由</Text>
        <Text style={{ color: '#525f7f', margin: '0' }}>{reason}</Text>
      </Section>
      {newEstimate && (
        <Text style={{ color: '#525f7f', marginTop: '16px' }}>
          新しいお届け予定日: <strong>{newEstimate}</strong>
        </Text>
      )}
      <Text style={{ color: '#525f7f' }}>
        ご不明な点がございましたら、お気軽にお問い合わせください。
      </Text>
    </EmailLayout>
  )
}
