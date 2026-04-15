# 配送プラン（shippingPlans）本番データ移行手順書

> 作成日: 2026-04-15  
> 対象ブランチ: main  
> 担当: Daisuke Okuyama

---

## 1. 概要と目的

### 何が変わるか

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 配送料管理 | SiteSettings のフラットフィールド（`shippingStandardBaseFee` 等） | `shippingPlans` 配列による複数プラン管理 |
| 銀行振込期限 | 注文日 + N日 の固定計算 | **発送予定日 - N日** 基準（プランごとに指定） |
| チェックアウト | 配送プラン選択なし | Radio UI でプラン選択 |

### 影響範囲

- **チェックアウト** (`/checkout`): 配送プラン選択 UI の表示
- **注文作成 API** (`/api/create-checkout-session`, `/api/create-bank-transfer-order`): `shippingPlanId` / `shippingPlanName` / `scheduledShipDate` を受け取り保存
- **配送料計算 API** (`/api/calculate-shipping`): planId 指定・全プラン一覧の 3 モード対応
- **注文完了ページ** (`/order-complete`): `shippingPlanName` / `scheduledShipDate` の表示
- **メールテンプレート**: `shippingPlanName` / `scheduledShipDate` / 銀行振込情報ブロック
- **特商法ページ** (`/legal`): shippingPlans 駆動の表示
- **ご利用ガイド** (`/delivery`): shippingPlans 駆動の表示

---

## 2. 事前準備（本番切替前）

以下をすべてチェックしてから作業に進むこと。

- [ ] ステージング環境で全フロー動作確認済み（チェックアウト → 注文完了 → メール受信）
- [ ] 本番 DB の完全バックアップ（Neon コンソール → ブランチ → スナップショット作成）
- [ ] MakeShop 会員データ移行 Phase B/C/D と**並行して作業しない**（他 DB 変更との混在リスク）
- [ ] site-settings キャッシュ（60 秒 TTL）が切れるのを待つか、強制クリアの手順を確認済み
- [ ] Vercel の本番デプロイ権限があることを確認
- [ ] Resend ダッシュボードにアクセスできることを確認（デプロイ後のメール監視用）

---

## 3. 本番ロールアウト手順

### ステップ 1: DB テーブル追加（T1.2 + T2.1）

まず --dry-run で発行 SQL を確認してから本番適用する。

```bash
# プロジェクトルートに移動
cd /path/to/u-balloon

# 発行予定 SQL の確認（データ変更なし）
node scripts/db-add-shipping-plans.mjs --dry-run

# 問題なければ本番適用
node scripts/db-add-shipping-plans.mjs
```

**追加される DB オブジェクト:**

| オブジェクト | 種別 | 内容 |
|------------|------|------|
| `site_settings_shipping_plans` | テーブル | 配送プラン本体（name, carrier, base_fee 等） |
| `site_settings_shipping_plans_regional_fees` | テーブル | 地域別料金（region, fee, note） |
| `orders.shipping_plan_id` | 列 (nullable) | 注文に紐づくプラン ID |
| `orders.shipping_plan_name` | 列 (nullable) | 注文時のプラン名（スナップショット） |
| `orders.scheduled_ship_date` | 列 (nullable) | 注文時の発送予定日（タイムスタンプ） |

**冪等性確認:** `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` のため、再実行しても既存データに影響なし。

完了後に確認:

```bash
# テーブル存在チェック（psql または Neon SQL エディタ）
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'site_settings_shipping_plans%'
ORDER BY table_name;

-- 期待結果:
-- site_settings_shipping_plans
-- site_settings_shipping_plans_regional_fees

SELECT column_name FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('shipping_plan_id', 'shipping_plan_name', 'scheduled_ship_date');

-- 期待結果: 3 行
```

---

### ステップ 2: コードデプロイ

Vercel ダッシュボードで main ブランチの最新コミットを本番にプロモート（または自動デプロイが有効な場合は push するだけ）。

デプロイ完了後、Vercel のデプロイログにエラーがないことを確認する。

---

### ステップ 3: 旧フィールド → shippingPlans 自動投入（T1.4）

**ステップ 2 のデプロイ完了後に実行すること**（テーブルが存在している必要がある）。

```bash
# 投入予定データの確認（データ変更なし）
node scripts/seed-shipping-plans.mjs --dry-run

# 問題なければ本番投入
node scripts/seed-shipping-plans.mjs
```

**投入されるプラン:**

| プラン名 | carrier | 計算方式 | 補足 |
|---------|---------|---------|------|
| 通常配送 | yamato | 距離ベース | 旧 `shippingStandardBaseFee` 等から変換 |
| u-balloon デリバリー便 | self_delivery | 距離ベース | 旧 `shippingDeliveryBaseFee` 等から変換 |

**冪等性確認:** `site_settings_shipping_plans` に 1 件以上のレコードがある場合は skip する。再実行しても重複投入されない。

---

### ステップ 4: 動作確認

以下をすべて確認する。

- [ ] 管理画面 `/admin/globals/site-settings` を開き、「配送プラン」配列に 2 件のプランがあることを確認
- [ ] `/delivery` ページで新しい配送プラン一覧の表示に切り替わっていることを確認
- [ ] `/legal` ページで特商法の配送情報が新しいプランに基づいて表示されていることを確認
- [ ] `/checkout` で住所入力後にプラン選択 Radio UI が表示されることを確認
- [ ] テスト注文（銀行振込）を 1 件作成し、注文完了ページで `shippingPlanName` と `scheduledShipDate` が表示されることを確認
- [ ] テスト注文の確認メールで `shippingPlanName` / `scheduledShipDate` / 銀行振込情報ブロックが正しく表示されることを確認

---

### ステップ 5: 既存未完了注文の振込期限の扱い（任意）

新ルール（発送予定日 - N日）はデプロイ後の新規注文にのみ適用される。デプロイ前に作成された bank_transfer 注文の `bankTransferDeadline` は従来ルール（注文日 + N日）のまま変わらない。

これらを新ルールに揃える必要がある場合、まず対象注文を確認する:

```sql
-- DRY RUN: 発送予定日が未設定の未完了銀行振込注文を確認
SELECT id, order_number, bank_transfer_deadline, scheduled_ship_date, created_at
FROM orders
WHERE payment_method = 'bank_transfer'
  AND status IN ('awaiting_payment', 'pending', 'confirmed')
  AND scheduled_ship_date IS NULL
ORDER BY created_at DESC;
```

対応方針: 基本的には**個別対応を推奨**（自動一括更新はしない）。該当注文がある場合は管理画面から `scheduledShipDate` を手動設定し、必要であれば `bankTransferDeadline` を再計算する SQL を個別に発行する。

---

## 4. ロールバック戦略

### 4-1. 軽微な問題 — フォールバックで対応（推奨）

配送プラン設定の問題であれば、コードを戻さずに対応できる。

**操作:** 管理画面 `/admin/globals/site-settings` を開き、全プランを `active: false` に変更するか、配列を空にする。

**結果:** `buildLegacyPlansFromOldSettings` によって旧フィールド（`shippingStandardBaseFee` 等）から自動生成されたプランが代わりに使われ、従来挙動に戻る。

- DB のテーブル（`site_settings_shipping_plans` 等）はそのまま残す
- コードは変更不要

---

### 4-2. コードを戻す — 重大な問題（Vercel revert）

API や UI で重大な問題が発生した場合。

1. Vercel ダッシュボードの「Deployments」から直前のデプロイを選択し「Redeploy」する
2. DB の変更はロールバック**不要**: 追加テーブル（`site_settings_shipping_plans` / `site_settings_shipping_plans_regional_fees`）はそのまま残す
3. `orders` の新列（`shipping_plan_id` / `shipping_plan_name` / `scheduled_ship_date`）も残す（NULL 許容のため既存データへの影響なし）
4. 旧コードは追加テーブルを参照しないため、残留しても問題ない

---

### 4-3. DB テーブル削除 — 完全撤退（通常不要）

DBを完全に元の状態に戻す必要がある場合のみ実行する。通常は不要。

> **警告:** テーブルに投入済みのデータが失われる。実行前に必ず Neon のスナップショットを確認すること。

```sql
-- 子テーブルを先に削除（CASCADE があるが明示する）
DROP TABLE IF EXISTS site_settings_shipping_plans_regional_fees CASCADE;
DROP TABLE IF EXISTS site_settings_shipping_plans CASCADE;

-- orders の追加列を削除
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_plan_id;
ALTER TABLE orders DROP COLUMN IF EXISTS shipping_plan_name;
ALTER TABLE orders DROP COLUMN IF EXISTS scheduled_ship_date;
```

---

## 5. 監視ポイント（デプロイ後 24h）

| 監視対象 | 確認方法 | 異常の基準 |
|---------|---------|-----------|
| `/api/calculate-shipping` の 5xx 率 | Vercel Functions ログ | 平常時より増加したら調査 |
| `/checkout` コンバージョン率 | Vercel Analytics または注文数 | 前日比で著しく低下したら調査 |
| `/order-complete` 到達数 | Vercel Analytics | `/checkout` 入力数との乖離が拡大したら調査 |
| `scheduledShipDate not provided` warn ログ | Vercel Functions ログ | 頻発（10件/h 超）していたら `/api/create-bank-transfer-order` を確認 |
| メール配信エラー | Resend ダッシュボード | エラーレートが上昇したら email-templates.tsx を確認 |

---

## 6. スケジュール提案

現状: 本番切替（MakeShop → u-balloon.com）まで約 10 日

| タイミング | 作業内容 |
|-----------|---------|
| **Day -7** | ステージング環境にデプロイ、E2E 確認（チェックアウト〜メール受信まで一通り） |
| **Day -5** | リハーサル: ステージング DB を全リセット → マイグレーション → seed → E2E（本番と同じ手順で通しで実施） |
| **Day -3** | 本番切替リハーサル（時間帯確認、関係者アサイン、障害時連絡網の確認） |
| **Day 0** | 本番デプロイ。**低トラフィック帯（深夜〜早朝）推奨** |
| **Day 0〜+1** | 24h 監視（上記セクション 5 の項目を継続チェック） |

---

## 7. 既知の制限 / 今後の TODO

- **旧フィールドの残置**: `shippingStandardBaseFee` 等の旧フィールドは SiteSettings に残置している。削除は別イテレーションで行う
- **productType フィールド**: Products コレクションのフィールドとして残る。将来的に Products → 利用可能プラン（relationship）に置き換える検討余地あり
- **全プランモードのレスポンスサイズ**: `/api/calculate-shipping` の全プランモードは Google Maps Distance Matrix を 1 回だけ呼ぶ。現状 10 プラン程度は問題ないが、プランが大幅に増える場合は要検討
- **発送予定日バリデーション未実装**: `scheduledShipDate < 今日` になってしまうケース（発送予定日が過去の日付のとき警告するなど）のバリデーションは未実装。管理画面での入力ミスに注意
- **旧コードの退役**: `buildLegacyPlansFromOldSettings` はフォールバック用途で残しているが、本番移行が安定したら削除する
