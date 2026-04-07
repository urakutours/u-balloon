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

━━━ 制限付きキーの作成（推奨） ━━━

標準のシークレットキー（sk_live_）は全権限を持つため、
用途を限定した制限付きキー（rk_live_）の使用を推奨します。

【作成手順】
1. Stripe ダッシュボード → 「開発者」→「APIキー」を開く
2. 「制限付きのキー」セクションの「＋ 制限付きのキーを作成」をクリック
3. キーの名前を入力（例: u-balloon）
4. 以下の3つのリソースのみ「書き込み」に設定し、他は全て「なし」のまま:
   • Checkout Sessions — 書き込み
   • Customers — 書き込み
   • Subscriptions — 書き込み
5. 「キーを作成」をクリック
6. 表示されたキー（rk_test_ または rk_live_）をコピーし、上のシークレットキー欄に入力

※ テスト環境・本番環境それぞれで制限付きキーを作成してください
※ 標準キー（sk_live_）は管理・緊急対応用として Stripe ダッシュボードで保管してください

【セキュリティ】
- シークレットキーは保存時に自動で暗号化されます
- 公開可能キー（pk_...）はここに入力不要です（フロントエンド設定で管理）`

export default function StripeHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
