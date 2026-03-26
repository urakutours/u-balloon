# u-balloon.com ドメイン移行チェックリスト

makeshop → Vercel への移行時に必要な作業をまとめたものです。
セキュリティ監査（2026-03-25実施）の結果に基づいています。

## 前提条件

- [ ] Vercel へのデプロイが完了し、`.vercel.app` ドメインで動作確認済み
- [ ] Stripe Webhook、Resend など外部サービスとの連携テスト済み
- [ ] Payload CMS 管理画面へのログイン・操作確認済み
- [ ] 配送料計算（Distance Matrix API）の動作確認済み

## 移行手順

### Step 1: Vercel プロジェクトにドメインを追加

- [ ] Vercel ダッシュボード → u-balloon プロジェクト → Settings → Domains
- [ ] `u-balloon.com` を追加
- [ ] `www.u-balloon.com` も追加（リダイレクト用）

### Step 2: Vercel 環境変数の設定

- [ ] `NEXT_PUBLIC_APP_URL` を `https://u-balloon.com` に設定
- [ ] `GOOGLE_MAPS_API_KEY` を設定（サーバーサイド専用、NEXT_PUBLIC_ 接頭辞を付けないこと）
- [ ] `STRIPE_SECRET_KEY` を設定
- [ ] `STRIPE_WEBHOOK_SECRET` を本番用に更新
- [ ] `RESEND_API_KEY` を設定
- [ ] `PAYLOAD_SECRET` を設定
- [ ] `DATABASE_URI` を Supabase 本番接続文字列に設定
- [ ] Vercel Settings → Security & Privacy → 「Enforce Sensitive Environment Variables」を有効化

### Step 3: Supabase の設定更新

- [ ] Authentication → URL Configuration → Site URL を `https://u-balloon.com` に変更
- [ ] 必要に応じて Redirect URLs に `https://u-balloon.com/**` を追加

### Step 4: Stripe Webhook の更新

- [ ] Stripe ダッシュボードで本番用 Webhook エンドポイントを `https://u-balloon.com/api/stripe-webhook` に設定
- [ ] 新しい Webhook Secret を Vercel 環境変数に反映

### Step 5: Resend（メール送信）の設定

- [ ] 送信ドメインとして `u-balloon.com` を Resend に登録・DNS 認証
- [ ] SPF / DKIM / DMARC レコードを DNS に追加

### Step 6: DNS 切り替え

- [ ] makeshop 側で移行準備が完了していることを確認
- [ ] DNS レコードを Vercel の指示に従って変更（CNAME または A レコード）
- [ ] SSL 証明書が Vercel で自動発行されることを確認（数分〜数十分）
- [ ] `https://u-balloon.com` でサイトが正常に表示されることを確認

### Step 7: 移行後の確認

- [ ] トップページ・商品ページの表示確認
- [ ] カート → 注文フローの動作確認
- [ ] 配送料計算が正しく動作するか確認
- [ ] Payload CMS 管理画面（`/admin`）にログインできるか確認
- [ ] Stripe 決済テスト（テストモード → 本番モード切り替え）
- [ ] メール送信テスト（注文確認メールなど）
- [ ] `www.u-balloon.com` → `u-balloon.com` へのリダイレクト確認

## セキュリティ設定（実施済み / 不要）

以下は 2026-03-25 のセキュリティ監査で対応済み、または対応不要と判断した項目です。

### Google Cloud（対応済み）
- API キーを Distance Matrix API のみに制限済み
- 予算アラート ¥1,000/月（50% / 90% / 100%）設定済み
- 請求異常検知 有効
- Essential Contacts に urakutours@gmail.com を全カテゴリで登録済み
- HTTP リファラー制限は**不要**（サーバーサイド呼び出しのため、設定するとブロックされる）

### Supabase（確認済み）
- プロジェクトアクセス: 1メンバー（Owner）のみ
- API キー: 最小構成（Publishable 1 + Secret 1）
- RLS 無効: Payload CMS が service_role で直接アクセスするため現状維持
  - **重要**: service_role キーは絶対にクライアントサイドに露出させないこと

### Vercel（確認済み）
- チームメンバー: 1名（Owner）のみ
- 2FA 有効
- Deployment Protection: Standard Protection
