/**
 * 注文確認画面・確認メールで共通して使う表示フォーマッタ関数群
 */

export function formatTimeSlot(slot?: string | null): string {
  switch (slot) {
    case 'morning': return '午前'
    case 'afternoon': return '午後'
    case 'evening': return '夕方'
    case 'night': return '夜'
    default: return '指定なし'
  }
}

export function formatCarrier(carrier?: string | null): string {
  switch (carrier) {
    case 'yamato': return 'ヤマト運輸'
    case 'sagawa': return '佐川急便'
    case 'jp_post': return '日本郵便'
    case 'yupack': return 'ゆうパック'
    case 'self_delivery': return 'u-balloon デリバリー便（自社配送）'
    case 'other': return 'その他'
    default: return '未定'
  }
}

export function formatPaymentMethod(method?: string | null, last4?: string | null): string {
  if (method === 'bank_transfer') return '銀行振込（前払い）'
  if (method === 'stripe' || method === 'credit_card') {
    return last4 ? `クレジットカード（末尾 ${last4}）` : 'クレジットカード'
  }
  return method || '未指定'
}

export function formatReceivedAt(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
