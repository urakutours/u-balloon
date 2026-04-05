'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】

■ Stripe シークレットキーの取得

1. Stripe ダッシュボード (https://dashboard.stripe.com/) にログイン
2. 左メニュー「開発者」→「APIキー」
3. 「シークレットキー」の「表示」をクリック
4. 「sk_live_...」または「sk_test_...」で始まる文字列をコピー
5. 「Stripe シークレットキー」欄に貼り付けて保存

■ Webhook シークレットの取得

1. Stripe ダッシュボード「開発者」→「Webhook」
2. 「エンドポイントを追加」をクリック
3. URL: https://your-domain.com/api/webhooks/stripe
4. イベント「checkout.session.completed」「checkout.session.expired」を選択
5. 作成後「署名シークレット」の「表示」→ コピー
6. 「Webhook シークレット」欄に貼り付けて保存

■ テスト環境 vs 本番環境
- ローカル開発: テストキー（sk_test_...）を使用
- 本番環境: 本番キー（sk_live_...）に切り替える

【セキュリティ】
- シークレットキーは保存時に自動で暗号化されます
- 公開可能キー（pk_...）はここに入力不要です（フロントエンド設定で管理）`

export default function StripeHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
