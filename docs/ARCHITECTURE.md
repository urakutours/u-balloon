# U-BALLOON サイト構成概要

> 最終更新: 2026-04-02

## 1. プロジェクト概要

バルーンギフト専門ECサイト。商品の閲覧・購入、配送予約、ポイント管理、ニュースレター等を提供。

- **リポジトリ**: `urakutours/u-balloon` (GitHub)
- **ブランチ**: `main`
- **URL (ステージング)**: https://u-balloon.vercel.app

---

## 2. 技術スタック

| レイヤー | 技術 | バージョン |
|---|---|---|
| フレームワーク | Next.js (Turbopack) | 16.2.1 |
| CMS | Payload CMS | 3.80.0 |
| フロントエンド | React | 19.2.4 |
| 言語 | TypeScript | 5.9.3 |
| CSS | TailwindCSS | 4.2.2 |
| 状態管理 | Zustand | 5.0.12 |
| フォーム | React Hook Form | 7.72.0 |
| バリデーション | Zod | 4.3.6 |

---

## 3. インフラ構成

```
[ユーザー]
    |
    v
[Cloudflare Workers] ── uballoon-edge.urakutours.workers.dev
    |  ├── /media/*   → R2画像キャッシュ配信 (30日)
    |  ├── /api/* GET → エッジキャッシュ (TTL 60秒)
    |  ├── /api/* POST→ レートリミット + Bot対策
    |  └── /__purge   → キャッシュ無効化
    |
    v
[Vercel] ── u-balloon.vercel.app (リージョン: sin1)
    |  ├── Next.js SSR / ISR
    |  ├── Payload CMS 管理画面 (/admin)
    |  └── API Routes (24エンドポイント)
    |
    +──→ [Neon] PostgreSQL (ap-southeast-1)
    |       └── 19コレクション (商品/注文/ユーザー等)
    |
    +──→ [Cloudflare R2] uballoon-media バケット
    |       └── 商品画像 2,954枚 (S3互換)
    |
    +──→ [Stripe] 決済処理
    |       ├── チェックアウトセッション
    |       ├── サブスクリプション
    |       └── Webhook → /api/webhooks/stripe
    |
    +──→ [Resend] トランザクションメール (東京リージョン)
            ├── 送信元: noreply@u-balloon.com
            ├── 返信先: info@u-balloon.com
            └── 管理者通知: admin@u-balloon.com
```

---

## 4. 外部サービス一覧

| サービス | 用途 | 環境変数 |
|---|---|---|
| **Neon** | PostgreSQLデータベース | `DATABASE_URL` |
| **Cloudflare R2** | 画像ストレージ | `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` |
| **Cloudflare Workers** | エッジCDN・キャッシュ・Bot対策 | `NEXT_PUBLIC_CDN_URL`, `CACHE_PURGE_SECRET` |
| **Stripe** | 決済 (クレジットカード・サブスクリプション) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Resend** | トランザクションメール | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, `ADMIN_ALERT_EMAIL` |
| **Google Maps** | 配送距離計算 | `GOOGLE_MAPS_API_KEY` |
| **Google Analytics 4** | アクセス解析・コンバージョン計測 | 測定IDは管理画面のSiteSettings で管理。Data API 用: `GA4_SERVICE_ACCOUNT_KEY` |
| **Xserver** | ドメインDNS・メール受信 | (外部管理) |

---

## 5. Payload CMS コレクション (19個)

### コマース
| コレクション | 用途 |
|---|---|
| Products | 商品マスター (451商品) |
| Orders | 注文管理 |
| OrderAuditLogs | 注文変更履歴 |
| PointTransactions | ポイント取引履歴 |
| Promotions | プロモーション・クーポン |
| SecretSales | シークレットセール |
| SubscriptionPlans | サブスクリプションプラン |
| Subscriptions | サブスクリプション契約 |

### コンテンツ
| コレクション | 用途 |
|---|---|
| Pages | 固定ページ (会社概要、利用規約等) |
| Posts | ブログ記事 |
| Media | 画像・メディアファイル |
| Forms | お問い合わせフォーム定義 |
| FormSubmissions | フォーム送信データ |

### マーケティング
| コレクション | 用途 |
|---|---|
| NewsletterSubscribers | メルマガ購読者 |
| Newsletters | メルマガコンテンツ |
| EmailTemplates | メールテンプレート管理 |
| ABTests | A/Bテスト設定 |

### システム
| コレクション | 用途 |
|---|---|
| Users | ユーザー管理 (ロール: admin / customer) |
| BusinessCalendar | 営業日カレンダー |

---

## 6. フロントエンドページ

| パス | 内容 |
|---|---|
| `/` | トップページ (ヒーロー・カテゴリ・特集) |
| `/products` | 商品一覧 (フィルタ・ソート・ページネーション) |
| `/products/[slug]` | 商品詳細 |
| `/cart` | カート |
| `/checkout` | チェックアウト |
| `/order-complete` | 注文完了 |
| `/login`, `/register` | ログイン・会員登録 |
| `/account` | マイページ |
| `/change-password` | パスワード変更 |
| `/blog` | ブログ一覧 |
| `/contact` | お問い合わせ |
| `/faq` | よくある質問 |
| `/about` | 会社概要 |
| `/delivery` | 配送について |
| `/legal` | 特定商取引法 |
| `/privacy` | プライバシーポリシー |
| `/terms` | 利用規約 |
| `/sale` | セール |
| `/pages/[slug]` | 動的ページ |

---

## 7. API エンドポイント (24個)

### 商品・検索
- `GET /api/products` — 商品一覧 (フィルタ・ソート)
- `GET /api/option-products` — オプション商品
- `GET /api/search` — 商品検索
- `GET /api/check-stock` — 在庫確認

### 決済・注文
- `POST /api/create-checkout-session` — Stripe決済セッション作成
- `POST /api/create-bank-transfer-order` — 銀行振込注文
- `POST /api/create-subscription` — サブスクリプション作成
- `POST /api/validate-coupon` — クーポン検証
- `POST /api/calculate-shipping` — 送料計算
- `GET /api/available-dates` — 配達可能日

### Webhook
- `POST /api/webhooks/stripe` — Stripe Webhook

### ポイント
- `POST /api/points/use` — ポイント使用

### フォーム・メール
- `POST /api/form-submit` — フォーム送信
- `POST /api/newsletter/subscribe` — メルマガ登録
- `GET /api/newsletter/unsubscribe` — メルマガ解除

### マーケティング
- `GET /api/ab-test` — A/Bテスト取得
- `POST /api/ab-test` — A/Bテスト結果記録
- `POST /api/secret-sale` — シークレットセール

### 管理者
- `GET /api/admin/dashboard` — ダッシュボードデータ（期間: today/week/month/custom, KPI集計・GA4コンバージョン率）
- `POST /api/admin/send-customer-email` — 顧客メール送信
- `POST /api/admin/send-newsletter` — メルマガ一括送信
- `POST /api/admin/migrate-points` — ポイント移行

### 外部連携
- `GET /api/feed/google-merchant` — Google Merchant Feed
- `GET /api/embed-code` — 埋め込みコード生成
- `GET /api/embed/[productId]` — 商品埋め込みウィジェット

---

## 8. メールシステム

### 自動送信メール (8テンプレート)
| テンプレート | トリガー |
|---|---|
| WelcomeEmail | 会員登録時 |
| OrderConfirmEmail | 注文作成時 |
| OrderStatusUpdateEmail | 注文ステータス変更時 |
| PointsEarnedEmail | 注文確定時 (3%ポイント付与) |
| ShippingNotificationEmail | 管理者が発送通知 |
| DelayNotificationEmail | 管理者が遅延通知 |
| FormNotificationEmail | お問い合わせ受信時 → 管理者 |
| AdminAlertEmail | 在庫切れ・新規注文・キャンセル等 |

### 配送業者トラッキング対応
- ヤマト運輸、ゆうパック、佐川急便

---

## 9. Cloudflare Workers (エッジ機能)

**Worker URL**: `uballoon-edge.urakutours.workers.dev`

### 画像配信 (`/media/*`)
- R2バケットから直接配信 (S3 APIオーバーヘッドなし)
- `Cache-Control: public, max-age=30日, immutable`
- 画像最適化 (WebP/AVIF) は Next.js `<Image>` コンポーネントで実行

### APIエッジキャッシュ (`/api/*` GET)
| エンドポイント | TTL |
|---|---|
| `/api/products` | 60秒 |
| `/api/search` | 30秒 |
| `/api/option-products` | 120秒 |
| `/api/available-dates` | 300秒 |
| `/api/feed/google-merchant` | 3600秒 |

### レートリミット (`/api/*` POST)
| エンドポイント | 制限 |
|---|---|
| checkout / bank-transfer | 5 req/min |
| subscription | 3 req/min |
| form-submit / newsletter | 3 req/5min |
| validate-coupon | 10 req/min |
| search (GET) | 30 req/min |
| User-Agent無しPOST | 403拒否 |

---

## 10. バックアップ体制

### GitHub Actions 自動バックアップ
- **スケジュール**: 毎週日曜 AM3:00 (JST)
- **保存先**: Cloudflare R2
- **形式**: `pg_dump` → gzip圧縮
- **ローテーション**:
  - Weekly: 5週間保持
  - Monthly: 5週超の古いバックアップを月次に昇格 (12ヶ月保持)
  - Yearly: 12ヶ月超を年次に昇格 (無期限保持)
- **手動実行**: GitHub Actions → workflow_dispatch

---

## 11. DNS構成 (Xserver管理)

| レコード | ホスト | 値 | 用途 |
|---|---|---|---|
| A | u-balloon.com | 162.43.120.167 | Xserverウェブ |
| A | *.u-balloon.com | 162.43.120.167 | ワイルドカード |
| CNAME | www | uballoon.cn.makeshop.jp | 旧MakeShop (移行後削除予定) |
| MX | u-balloon.com | u-balloon.com | Xserverメール受信 |
| TXT | u-balloon.com | v=spf1 ... ~all | Xserver SPF |
| TXT | resend._domainkey | p=MIGfMA... | Resend DKIM |
| TXT | send | v=spf1 include:amazonses.com ~all | Resend SPF |
| MX | send | feedback[...]ses.com | Resend バウンス処理 |
| TXT | _dmarc | v=DMARC1; p=none; | DMARC |

---

## 12. 環境変数一覧

### ローカル開発 (`.env`)
```
DATABASE_URL=postgresql://...
PAYLOAD_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_MAPS_API_KEY=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
R2_BUCKET=uballoon-media
R2_ENDPOINT=https://...r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-...
RESEND_API_KEY=re_...
EMAIL_FROM_ADDRESS=noreply@u-balloon.com
EMAIL_FROM_NAME=uballoon
EMAIL_REPLY_TO=info@u-balloon.com
ADMIN_ALERT_EMAIL=admin@u-balloon.com
NEXT_PUBLIC_CDN_URL=https://uballoon-edge.urakutours.workers.dev
CACHE_PURGE_SECRET=...
```

### Vercel (本番)
上記に加え:
- `STRIPE_SECRET_KEY` = 本番キー (`sk_live_...`)
- `NEXT_PUBLIC_APP_URL` = `https://u-balloon.vercel.app`

### Cloudflare Workers
- `ORIGIN_URL` = `https://u-balloon.vercel.app`
- `ALLOWED_ORIGINS` = `https://u-balloon.vercel.app,http://localhost:3000`
- `CACHE_PURGE_SECRET` = (Secret)
- R2 Bucket Binding: `MEDIA_BUCKET` → `uballoon-media`
- KV Namespace: `RATE_LIMIT_KV`

### GitHub Secrets (バックアップ用)
- `DATABASE_URL`, `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

---

## 13. カスタム管理画面ダッシュボード

Payload CMS のデフォルトダッシュボードを EC 運営に最適化したカスタム実装に置き換えています。

### ファイル構成

| ファイル | 役割 |
|---|---|
| `src/components/admin/DashboardClient.tsx` | ダッシュボード UI (クライアントコンポーネント) |
| `src/components/admin/Dashboard.tsx` | SSR データフェッチ (サーバーコンポーネント) |
| `src/components/admin/CustomNav.tsx` | カスタムサイドバーナビゲーション |
| `src/app/(frontend)/api/admin/dashboard/route.ts` | KPI 集計 API エンドポイント |
| `src/lib/ga4-data.ts` | GA4 Data API 連携 (コンバージョン率取得) |
| `src/lib/gtag.ts` | GA4 eCommerce イベントヘルパー |
| `src/components/GoogleAnalytics.tsx` | gtag.js スクリプト挿入コンポーネント |
| `src/globals/SiteSettings.ts` | サイト設定 Global (GA4 ID など) |
| `src/app/(payload)/custom.scss` | Payload 管理画面 CSS オーバーライド |

### ダッシュボード KPI 一覧

| 指標 | 集計方法 |
|---|---|
| 売上合計 | 期間内の `totalAmount` 合計 |
| 注文数 | 期間内の注文件数 |
| 要対応件数 | `status = pending` または `awaiting_payment` の件数 |
| 本日/明日の配送 | `desiredArrivalDate` による絞り込み |
| 前期比 | 直前の同期間と比較（前日比/前週比/前月比/前期比） |
| コンバージョン率 | GA4 Data API (セッション数 / 注文数) |
| 平均注文額 | 全非キャンセル注文の平均 `totalAmount` |
| リピート率 | 2件以上注文した顧客数 / 全ユニーク顧客数 |
| 平均 LTV | 全非キャンセル売上 / ユニーク顧客数 |

### GA4 連携セットアップ手順

1. Google Cloud Console でプロジェクトを作成し「Google Analytics Data API」を有効化
2. サービスアカウントを作成し JSON キーをダウンロード
3. GA4 管理画面でサービスアカウントに「閲覧者」権限を付与
4. 環境変数に JSON キーの**内容**を設定:
   ```
   GA4_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
   ```
5. Payload 管理画面 > **サイト設定** > GA4 プロパティID に数値 ID を入力
6. 同じくサイト設定 > GA4 測定ID (G-XXXXXXXXXX) を入力 → フロントエンドに gtag.js が自動挿入される

### 環境変数 (GA4 関連)

| 変数名 | 必須 | 説明 |
|---|---|---|
| `GA4_SERVICE_ACCOUNT_KEY` | いいえ | GA4 Data API 用サービスアカウント JSON キー (文字列) |

> **Note**: GA4 測定 ID (`G-XXXXXXXXXX`) は `NEXT_PUBLIC_GA4_MEASUREMENT_ID` 環境変数では管理せず、
> Payload 管理画面の「サイト設定」グローバルから設定する。
