# Post-launch TODO (4/30 切替後対応項目)

> Phase G/H で workaround 採用 or post-launch 確定とした項目をここに集約。  
> Phase H 切替後、運用開始 1-4 週で順次対応。

---

## 🚚 ヤマト B2 クラウド 自動 CSV 出力 (Shift_JIS)

**経緯**: Phase G で論点1 として議論、web 版判断で Option B (手動運用) を採用。  
**現状**: `/api/admin/export/orders` で UTF-8 汎用 CSV のみ。B2 クラウドは Shift_JIS 必須。

### 着手条件

- 1 日の出荷件数が **10 件超え** が継続したとき (= Excel 転記の運用負荷限界)
- または Daisuke から自動化要望

### 実装スコープ

- 新規 route: `/api/admin/export/yamato-csv?status=shipped&dateFrom=...&dateTo=...`
- 文字コード変換: `iconv-lite` で UTF-8 → Shift_JIS
- ヤマト B2 必須カラム:
  - お問い合わせ伝票番号 (`Order.trackingInfo.trackingNumber`)
  - 送り状種別 (発払い / コレクト 等)
  - お客様コード
  - 出荷予定日 (`Order.scheduledShipDate`)
  - 配達指定日 (`Order.recipient.recipientDesiredArrivalDate`)
  - 配達指定時間 (`Order.recipient.recipientDesiredTimeSlotValue`)
  - クール区分 (バルーンは常温で固定値)
  - 貨物種別
  - 運賃管理番号
  - お届け先郵便番号 / 住所 / 名前 / 電話 / カナ
- テスト: ヤマト B2 sandbox で実 upload 確認 (Daisuke ヤマトアカウント必要)

### 工数見積

実装 1-2h + sandbox upload テスト 0.5-1h + 文字化け debug 余裕 = 半日想定。

---

## 📄 Pages collection 移行 (Privacy / Terms / Legal)

**経緯**: B5 follow-up、現在ハードコード fallback。  
**目的**: Admin (Daisuke) が CMS から法務ページを編集可能にする。

### 対応ファイル

- `src/app/(frontend)/privacy/page.tsx` — 9 sections ハードコード
- `src/app/(frontend)/terms/page.tsx` — sections array ハードコード
- `src/app/(frontend)/legal/page.tsx` — SiteSettings 値 + ハードコード混在

### 実装スコープ

- Pages collection に slug `privacy` / `terms` / `legal` で seed
- 各 page.tsx は Pages.findOne(slug) を最優先、fallback でハードコード
- Admin 側で edit → publish フロー確認

---

## 🎨 Issue 2/3 — 404 / 500 / メールデザイン rebrand

**経緯**: relatista / pomocare 流のブランドアラインデザインへ統一。  
**現状**: 404 は基本実装あり、メールテンプレも機能優先で装飾なし。

### スコープ

- `src/app/not-found.tsx` の visual rebrand (brand color / typography)
- `src/app/error.tsx` の rebrand
- email-templates.tsx の header/footer/CTA を brand 統一
- (任意) 動的 OG 画像生成 (Next.js og)

---

## 🖼️ TOP hero 高品質画像差し替え

**経緯**: Phase G で論点2 として議論、web 版判断で「即削除 + 4/29 までに Daisuke が画像可否判断」の 2 段構え。  
**Daisuke 判断**: 画像が出るなら placeholder 削除版から差し替え、出ないなら post-launch で対応。

### 候補

- 1920x800px hero 画像 (バルーンフォトを brand color tone で)
- スライダー化 (3-5 枚切替)
- 動画 hero (重い、要件定義必要)

---

## 🌐 sitemap.xml / robots.txt

**現状**: 未実装。  
**対応**: Next.js App Router の `app/sitemap.ts` / `app/robots.ts` で自動生成。

```typescript
// app/sitemap.ts (例)
export default async function sitemap() {
  // Pages + Products + 静的ルート
}
```

---

## ♿ アクセシビリティ強化

- 商品画像 alt 属性の網羅 (Media collection に alt 必須化)
- form ラベル / aria-* / focus indicator
- WCAG コントラスト比チェック (主要 brand color)

---

## 📊 Core Web Vitals 改善

- LCP (画像最適化、hero priority loading)
- CLS (font swap / 画像 reservation)
- INP (hydration cost 削減)

---

## 🔒 セキュリティ強化 (post-launch 段階的)

- CSP header (Stripe / Resend / GA4 のドメイン allowlist)
- X-Frame-Options / Strict-Transport-Security
- rate limit (Phase G で /api/auth/ /api/admin/ は対応、他 endpoint も検討)
- admin route の権限監査 (定期)
- **pg-connection-string SSL モード厳格化** (期限: pg-connection-string v3.0.0 / pg v9.0.0 リリース前)
  - 現状: `pg-connection-string@2.12.0` / `pg@8.16.3` で `prefer/require/verify-ca` が `verify-full` のエイリアスとして警告ログを出力
  - v3.0.0 / v9.0.0 で libpq 標準セマンティクスに変わり、CA 検証が緩い扱いになる
  - 対応: `DATABASE_URL` の `sslmode` を `verify-full` に明示 + Neon root CA 検証導入を検討
  - 検出: u-mini 監視で 2026-04-27 にエスカレ (`/api/admin/stripe-mode` 経由)、現状は警告のみで動作影響なし

---

## 🏪 Stripe webhook 旧 endpoint 削除

**経緯**: Phase H で新旧並列稼働、DNS 完全浸透 + 24h 経過後に削除。  
**期限**: 5/2 頃 (4/30 切替 + 48h 余裕)

### 手順

- Stripe Dashboard で旧 endpoint (`u-balloon.vercel.app/api/webhooks/stripe`) を delete
- SiteSettings から旧 webhook signing secret を削除
- 関連検証コード (旧 secret 対応) を剥がす PR

---

## 📧 Phase F — リニューアル案内メール (移行会員 824 名)

**経緯**: web 版判断で 4/30 一斉送信は Resend レピュテーション形成期間と重なり危険。  
**新方針**: 5/2 以降に **3 batch (300/300/224) 分割送信**。

### 文面要件

- 件名: 【u-balloon】サイトリニューアルのお知らせ + 移行のご案内
- 本文必須要素:
  - リニューアル経緯 (MakeShop からの移行)
  - **「初回ログインはパスワードリセット (forgot-password) からお願いします」** の明記
  - reset URL の発行手順 (画面遷移を含む)
  - 移行ポイントは引き継がれる旨
  - 問い合わせ窓口
- スクリプト: `scripts/send-migration-emails.ts` (新設)

### スケジュール

- 5/2 09:00: 1st batch 300 名
- 5/3 09:00: 2nd batch 300 名
- 5/4 09:00: 3rd batch 224 名
- 各 batch 後 2h: バウンス / 苦情率を Resend dashboard で確認、問題あれば次 batch 中断

---

## 🧹 設定値 / 運用整理 (随時)

- Vercel preview env (cookies.secret 不在問題、relatista でも発生)
- Cloudflare R2 / Workers の CORS / cache purge (使っているなら)
- Neon プラン降格判断 (`reference_neon_downgrade_uballoon.md` の 5 条件確認、2026-07-01 をレビューポイント)
- u-mini Phase 1 監視の new ドメイン追従確認 (Phase H 5-4 で実施済)

---

## 🌐 DNS レコード整理 (4/30 切替後、5月以降)

### 削除候補 (X サーバー時代の旧レコード)

| レコード | 削除理由 | 影響確認 |
|---|---|---|
| `default._domainkey.u-balloon.com TXT` | X サーバー旧 DKIM。X サーバー経由のメール送信を完全停止したら削除可 | `info@u-balloon.com` 受信は X サーバー継続だが、送信は Resend なのでこの DKIM は使われていない |
| `_adsp._domainkey.u-balloon.com TXT (dkim=unknown)` | ADSP は 2013 年 RFC 6541 で廃止された仕様 | 削除しても影響ゼロ、即実施可 |

### 確認候補 (削除可能性あり、要動作確認)

| レコード | 検討理由 | 削除前確認 |
|---|---|---|
| `*.u-balloon.com A 162.43.120.167` (X サーバー) | 4/30 切替後、ワイルドカード A をどうするか。Vercel に向けるか、削除するか | サブドメイン (例: `mail.u-balloon.com`、`webmail.u-balloon.com`) を X サーバーで使っているなら個別 A レコードを残す方向、ワイルドカードは外す |
| `u-balloon.com TXT (root SPF: v=spf1 +a:sv14166.xserver.jp ...)` | X サーバー経由送信の SPF。Resend は subdomain (`send.`) で SPF 別管理 | root from でメール送信したい場合、Resend 含む SPF に書換え必要。Daisuke 確定: emailFromAddress=noreply@u-balloon.com (root) のため、**書換えが必要**: `v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp include:amazonses.com ~all` |

### DMARC 強化 (5月以降、レピュテーション形成後)

- 現状: `_dmarc.u-balloon.com TXT v=DMARC1; p=none;`
- 推奨次段階: `v=DMARC1; p=none; rua=mailto:dmarc@u-balloon.com; pct=100` (集計受信先付き、Phase H で対応)
- 安定後 (5月中旬): `v=DMARC1; p=quarantine; rua=mailto:dmarc@u-balloon.com; pct=25` (段階的にスパム判定強化)
- 1ヶ月後: `v=DMARC1; p=quarantine; rua=mailto:dmarc@u-balloon.com; pct=100`
- 3ヶ月後 (問題なければ): `v=DMARC1; p=reject; rua=mailto:dmarc@u-balloon.com;` (なりすまし完全 reject)

---

## 📝 着手トリガー

各項目は以下のいずれかで着手:
- 該当条件の閾値超え (例: ヤマト B2 で 1 日 10 件)
- Daisuke からの要望
- 月次 review で優先度 re-rank

このファイルは段階的に「✅ 完了」マークを付け、対応済 commit を記録する。
