# Phase H — 本番切替手順書 (2026-04-30 05:00-07:00 JST)

> このファイルは Phase G (Web 整備) と並走で更新される空テンプレート。  
> Phase G の各項目が完了するたびに、関連セクションを更新する。  
> 起票: 2026-04-27 / 担当: Daisuke (実行) + メインPC Claude Code (起票・更新・直前監視)

---

## 1. 概要

| 項目 | 内容 |
|---|---|
| **対象** | u-balloon (Next.js + Payload v3 + Stripe + Resend + Neon Postgres) |
| **切替日時** | 2026-04-30 05:00-07:00 JST (DNS 浸透含む) |
| **新ドメイン** | `u-balloon.com` (ハイフン付き、ハイフンなし `uballoon.com` は別ドメイン扱い) |
| **旧サイト** | MakeShop (旧ドメイン) |
| **ゲート1** | 4/28 24:00 — ✅ EXECUTE_4_30 確定済 (PR #11 merge 完了) |
| **ゲート2** | 4/30 04:00 — 直前判定 (Phase G 動作確認結果 + workaround 不可リスト 照合) |
| **ロールバック判断期限** | 4/30 06:30 (DNS 切替後 1.5h 経過時点) |

---

## 2. 関係者・連絡経路

| 役割 | 担当 | 連絡 |
|---|---|---|
| 切替実行責任者 | Daisuke | (記入) |
| 技術サポート | メインPC Claude Code | session 経由 |
| 問い合わせ受信 | info@uraku.info → 自動転送 | u-mini Phase 1 監視 + email |
| 緊急ロールバック判断 | Daisuke | — |

---

## 3. NO_GO 判定基準 (workaround 不可リスト)

ゲート2 で以下のいずれかに該当したら **NO_GO_4_30** (切替延期):

- [ ] 注文確認メール送信失敗 (Stripe 注文 / 銀行振込注文のいずれか)
- [ ] Stripe live mode で test 決済が通らない
- [ ] 移行会員 824 名のうちサンプル 10 名でログイン不可
- [ ] 銀行振込フローで注文確認メール内に bankInfo (振込先 / 振込期限) が出ない
- [ ] 特商法ページの法人情報が空欄

**それ以外** (favicon / hero / 404 デザイン / sitemap 等) は workaround で go-live 可。

---

## 4. Pre-flight (4/30 04:00 - 04:55 JST)

### 4-1. 最終 CSV 取得 (Daisuke)

- [ ] MakeShop 管理画面から最新会員 CSV をエクスポート
- [ ] ファイル名・件数を記録: ___________________ / ____ 名
- [ ] `tmp/production/member_20260430.csv` に配置

### 4-2. 本番 DB 準備 (Daisuke + メインPC)

- [ ] Neon production branch (main 相当) を確定 — branch ID: __________
- [ ] DATABASE_URL を rehearsal branch から production branch に切替確認
- [ ] PITR (Point-in-Time Recovery) 確保期間が 7 日以上あることを確認
- [ ] 切替直前のスナップショットを取得 (Neon UI の "Branches" → "Create branch from current point")

### 4-3. ENV / 設定の確定 (Daisuke + メインPC)

- [ ] Vercel ENV `NEXT_PUBLIC_APP_URL=https://u-balloon.com` (production) 設定済
- [ ] SiteSettings.stripeMode = `live` 切替済
- [ ] SiteSettings に Stripe 3 本番 keys (`pk_live_`, `sk_live_`, `whsec_live_`) 入力済
- [ ] SiteSettings.resendApiKey = 本番 keys
- [ ] SiteSettings.googleMapsApiKey = 本番 key
- [ ] SiteSettings 全項目 (会社情報 / 配送 / SNS) 入力済 (Phase G で確認)
- [ ] **SiteSettings.emailFromAddress = `noreply@u-balloon.com`** (root domain、Daisuke 確定 2026-04-27)
- [ ] **SiteSettings.emailReplyTo = `info@u-balloon.com`** (X サーバー受信、Daisuke 確定 2026-04-27)
- [ ] ルート SPF を Resend 含むように更新確認 (root from `noreply@u-balloon.com` で送信するため):
  - 現状: `u-balloon.com TXT v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp ~all`
  - 推奨: `v=spf1 +a:sv14166.xserver.jp +a:u-balloon.com +mx include:spf.sender.xserver.jp include:amazonses.com ~all`
  - (もしくは Resend 側で root from が subdomain DKIM だけで通るなら現状維持可、Resend テスト送信で `Authentication-Results: spf=pass` を確認)

### 4-4. ゲート2 判定

- [ ] Phase G 動作確認結果を NO_GO 判定基準と照合
- [ ] 結果記録: GO / NO_GO_4_30
- [ ] NO_GO の場合: 5/2 以降への延期判断 + Daisuke 経由で会員告知差し替え

---

## 5. Cutover (4/30 05:00 - 07:00 JST)

### 5-1. import + ポイント投入 (~05:30)

- [ ] `/api/admin/import/customers` 呼び出し (最新 CSV)
  - 期待: 824 ± 10 件 created / 0 errors
  - allowLegacyEmailFormat context が効いていることを確認 (RFC 違反 8 件含む)
- [ ] `/api/admin/migrate-points` 呼び出し
  - 期待: 779 ± 数件 success / 0 errors
- [ ] T2.2 verification (adjust=0, db==json match)

### 5-2. DNS 切替 (~06:00)

#### 前提 (4/28 中に Daisuke 完了済)

- [x] TTL 300 短縮完了: `u-balloon.com A` / `www.u-balloon.com CNAME` / `*.u-balloon.com A`
- [x] Resend ドメイン認証 (subdomain mode `send.u-balloon.com`) verified
- [x] X サーバーで `info@u-balloon.com` メールアカウント作成 + DNS `u-balloon.com MX` 設定 (受信用、切替対象外)

#### Vercel custom domain 登録 (4/29 中に Daisuke 完了想定)

Vercel dashboard で `u-balloon.com` を u-balloon project に紐付けると、Vercel から以下の指示値が表示される:

- **Apex domain (root)** `u-balloon.com`: A レコード `76.76.21.21` (Vercel の固定 IP) 推奨
- **www subdomain** `www.u-balloon.com`: CNAME `cname.vercel-dns.com` 推奨
- (確認時刻次第で IP / CNAME 値は変わる可能性あり、Vercel UI の表示を正とする)

#### 4/30 切替操作手順

- [ ] **A レコード更新** (X サーバー DNS 管理画面)
  - `u-balloon.com A 162.43.120.167` (X サーバー) → `u-balloon.com A 76.76.21.21` (Vercel) に変更
  - TTL: 300 (既に短縮済)
- [ ] **www CNAME 更新**
  - `www.u-balloon.com CNAME uballoon.cn.makeshop.jp` (MakeShop) → `cname.vercel-dns.com` (Vercel) に変更
- [ ] **`*.u-balloon.com A` (ワイルドカード) 判断**
  - X サーバーで使うサブドメイン (例: `webmail.u-balloon.com`) があるなら、ワイルドカードを残し個別サブドメインを X サーバー A レコードに追記
  - サブドメイン未使用なら**ワイルドカードを削除** (意図しないアクセスを防ぐ)
  - `*.u-balloon.com` を Vercel に向けるのは、Vercel 側のルートで全 wildcard を受けるパターン (今回は推奨しない)
- [ ] **Vercel custom domain SSL 証明書発行確認**
  - Vercel dashboard で証明書 status を確認 (通常即時、稀に数十分)
  - 確認方法: `https://u-balloon.com/` にブラウザアクセス → 鍵マーク + Vercel が "Valid Configuration" を表示
- [ ] **DNS 浸透確認** (複数 resolver から)
  - `dig u-balloon.com @8.8.8.8` (Google DNS)
  - `dig u-balloon.com @1.1.1.1` (Cloudflare DNS)
  - `dig u-balloon.com @208.67.222.222` (OpenDNS)
  - 全て `76.76.21.21` 等の Vercel IP を返したら浸透完了
- [ ] **X サーバー受信維持確認** (`info@u-balloon.com`)
  - 切替後、自身の Gmail などから `info@u-balloon.com` に test mail 送信
  - X サーバー Webmail で受信確認
  - **MX レコードは触っていないので影響しないが、SPF が変わる場合は念のため確認**

### 5-3. Stripe webhook 切替 (~06:00)

> **重要**: 旧 endpoint を即削除しない。並列稼働 → DNS 完全浸透 + 24h 経過後に旧削除。

- [ ] Stripe Dashboard (Production) で新 endpoint `https://u-balloon.com/api/webhooks/stripe` 追加
- [ ] 旧 endpoint (vercel.app) は **そのまま保持** (DNS 浸透中の取りこぼし防止)
- [ ] 新 webhook signing secret (whsec_live_) を SiteSettings に追記 (旧と並列)
- [ ] webhook signature 検証コードが両 secret に対応しているか確認 (post-launch で旧削除時に剥がす)

### 5-4. 監視切替 (~06:30)

- [ ] u-mini `~/monitoring/uballoon/watch.sh` のターゲット URL を `vercel.app` → `u-balloon.com` に更新
- [ ] watch.sh 再起動確認

### 5-5. 動作確認 (06:30 - 07:00)

- [ ] `/` トップページ表示 (新ドメイン)
- [ ] `/admin` ログイン (Daisuke admin アカウント)
- [ ] komapan2000@yahoo.co.jp でログイン → /account 3 タブ表示確認
- [ ] 商品詳細 → カート → checkout (Stripe live で 1 円 test 注文 → 即 refund)
- [ ] 注文確認メール受信確認 (Gmail / docomo)
- [ ] /forgot-password → reset URL 受信確認

---

## 6. Post-flight (4/30 07:00 - 10:00 JST)

- [ ] 監視ログ (u-mini Phase 1) で error spike を確認
- [ ] Resend dashboard でバウンス率を確認 (DMARC `p=none` で集計受信)
- [ ] Stripe Dashboard で新 endpoint への webhook 受信確認
- [ ] Search Console「アドレス変更ツール」を MakeShop 旧ドメイン → u-balloon.com で申請
- [ ] 旧 MakeShop サイトの停止 (Daisuke 判断、HTTP 301 redirect to u-balloon.com 推奨)

---

## 7. Rollback 手順 (4/30 06:30 までに判断)

ロールバックを発動する条件:
- 切替後 1.5h 経過時点で**新ドメインの主要フローが復旧不能**
- 移行会員のログイン不可が広範
- 決済不通

### 7-1. DNS ロールバック

- u-balloon.com の A/CNAME を MakeShop に戻す (TTL 300 のため最速 5 分)

### 7-2. Vercel deploy ロールバック (必要なら)

- Vercel dashboard で前回成功 deployment に "Promote to Production"

### 7-3. DB ロールバック (必要なら)

- 4-2 で取得したスナップショット branch から Neon "Restore to point in time"
- 824 件 import 前の状態に戻す

### 7-4. 会員告知

- 「移行作業を一時停止しました」を SiteSettings.banner で表示 (新ドメイン側) or MakeShop 側

---

## 8. 監視ポイント (切替後 24h)

- [ ] エラーログ (Vercel logs / u-mini watch.sh)
- [ ] 注文確認メール送達率 (Resend dashboard)
- [ ] Stripe webhook 受信遅延
- [ ] Neon DB 接続数 / 負荷
- [ ] Search Console での新ドメインインデックス開始確認

---

## 9. 関連ドキュメント / コミット

- リハーサル結果: `docs/migration/rehearsal-result-2026-04-26.md`
- DNS / Resend 設定: `docs/dns-email-resend-setup.md`
- 配送設定: `docs/shipping-plans-migration.md`
- email テンプレ: `docs/email-templates-hybrid.md`
- post-launch TODO: `docs/post-launch-todo.md`
- 直近 commits:
  - `709aad0` (PR #11 RFC違反 email fix)
  - `b50edda` (PR #10 B 群 brand fields)
  - `ebe95e7` (PR #9 Phase E forgot/reset password)

---

## 10. Phase G 動作確認結果 (G 進捗で更新)

> Phase G の各項目が完了したらここに 1 行追記する。

- [ ] _(Phase G の checklist と同期)_
