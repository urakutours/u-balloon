'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】

■ Resend API キーの取得

1. Resend (https://resend.com/) にログイン
2. 右上のアカウントメニュー →「API Keys」
3. 「Create API Key」→ 名前を入力（例: uballoon-prod）
4. 権限「Sending access」または「Full access」を選択
5. 作成された「re_...」で始まるキーをコピー
6. 「Resend API キー」欄に貼り付けて保存

■ 送信元メールアドレスの設定

- 送信元アドレス: 例 noreply@u-balloon.com
  ※ Resend でドメイン認証済みのアドレスが必要です
- 表示名: 例 uballoon
- 返信先アドレス: 例 info@u-balloon.com（顧客の返信先）
- 管理者通知先: 在庫アラート・注文通知を受け取るメールアドレス

■ ドメイン認証
Resend でカスタムドメインを使うには DNS 設定が必要です。
詳細: https://resend.com/docs/dashboard/domains/introduction

【セキュリティ】
- API キーは保存時に自動で暗号化されます`

export default function EmailHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
