# MakeShop ステージングリハーサル実施結果 — 2026-04-25

## 実施情報

- **実施日**: 2026-04-25（実装は 2026-04-25 早夜）
- **実施者**: Daisuke + Claude Code 自動実行
- **本番切替予定**: 2026-04-30 05:00-07:00 JST
- **Preview URL**: https://u-balloon-lpvjk8j3o-urakutours-6576s-projects.vercel.app
- **Rehearsal Neon branch**: rehearsal-2026-04-25 (`br-silent-river-a15srkmb`)
- **使用 CSV**: tmp/rehearsal/member_20260425.csv（924 行 = ヘッダー 1 + データ 923）
- **Vercel git branch**: rehearsal/2026-04-25（最新 sha 8a6c757）
- **基準 commit**: 4efef52 (importMap revert)

## 数値結果

### CSV 変換 (Step 4)

```json
{"totalRows":923,"successRows":922,"skippedRows":1,"errorRows":0,"addressParseFailures":0,"genderUnmapped":0,"birthdayInvalid":0,"emailMissing":1,"pointsMigrationCount":868,"pointsMigrationTotal":336166}
```

閾値判定: errorRows=0/46.15 limit, skippedRows=1/92.3 limit → **PASSED**

### Import API (Step 5, 6)

```json
{"total":922,"created":816,"updated":98,"skipped":0,"errors_count":8}
```

- 実行時間: 4 分 8 秒
- DB 反映: legacy_id 持ちユーザー 816 件、すべて unique（is_unique=TRUE）
- created + updated + errors = 816 + 98 + 8 = 922 ✓
- **「updated 98 件」の正体**: CSV 内同一 legacy_id 重複行（MakeShop 側データ品質起因、最終 DB 上は unique）

### migrate-points API (Step 8, 9)

```json
{"total":868,"success":764,"errors":104}
```

- 実行時間: 1 分 4 秒
- API レスポンス形式: `{summary: {total, success, errors}, results: [...]}`（プロンプト想定 `{total, success, errors}` フラットと異なる、jq 要修正）
- DB 反映: point_transactions = 764 件（type='migration' 764, **type='adjust' 0** ← T2.2 PASS の決定的シグナル）
- 失われた points: convert 報告 336,166 - DB 反映 284661 = **51,505 pts (104 件)**

### T2.2 バグ修正検証 (Step 9)

- Sample 3 migrated users: 全員 migration_count=1, **adjust_count=0** ✓
- Global adjust for migrated users: **0** (期待値 0) ✓
- db_points vs JSON points (sample 5): 全件 match=YES ✓
- **検証結果: PASSED** ✅

`skipPointAdjustHook`（commit `f9b8631`）が rehearsal で完全動作。これが今回リハーサル最大の収穫。

### 認証フロー (Step 10)

- admin login: ✓ token 取得 (265 chars)
- ログイン (test user beni0228@..., id=1210, points=500): ✓
- `/api/users/me` (cookie + Authorization 両送信): ✓ has_user=true, requirePasswordChange=true
- `/change-password` 自動 redirect: **YES** (ユーザー報告)
- **/change-password でパスワード変更**: **❌ FAILED 「このアクションは許可されていません。」**
- /account 10 フィールド: 未確認（P0 発見につき確認中断）

### データ整合性 (Step 10-4)

- admin_count: 1 ✓
- legacyId uniqueness: total=816, unique=816, is_unique=TRUE ✓
- sample 3 users: role=customer, points 正常付与 (574/335/0)

---

## 問題リスト

| # | 発見 Step | カテゴリ | 内容 | 優先度 | 対応フェーズ | ステータス |
|---|---|---|---|---|---|---|
| 1 | Step 10-3 | **致命バグ** | `auth-context.tsx` が login token を保持せず Authorization header を送らない構造 → /change-password で全 MakeShop 移行ユーザーが Forbidden ロックアウト。**本番 production でも cookie 単独で同一エラー再現済み**（preview-only ではない） | **P0** | 本番切替前必須 fix | **未対応** |
| 2 | Step 8-9 | データロス | migrate-points 失敗 104 件、合計 51,505 pts が反映されない。原因: ① import で email validation reject 8 件、② CSV 重複 legacy_id 行 (98 件) に対応する points entries の集約不全 | **P1** | 本番切替前 fix 推奨 | 未対応 |
| 3 | Step 5 | データ品質 | import で email validation reject 8 件（行 188, 333, 368, ...）。MakeShop 側のデータ問題 | P1 | 本番切替前データクリーニング | 未対応 |
| 4 | Step 5 | データ品質 | CSV 内同一 legacy_id 重複行 98 件。最終 DB 上は unique なので無害だが convert script が dedup 不完全 | P2 | 本番切替後 cleanup でも可 | 未対応 |
| 5 | Step 1-3 / Step 2 | 運用 | Vercel Deployment Protection (preview) で全 curl が 401 → Protection Bypass for Automation token 必須 | P3（運用知見） | プロンプト v3.2 に反映 | 解消（運用化） |
| 6 | Step 2 | 運用 | `.env.rehearsal` の URL 系 (`?sslmode=...&channel_binding=require` 含む) はシングルクォート必須。`source` で `&` が background-job 演算子と解釈されて値が消える | P3（運用知見） | プロンプト v3.2 に反映 | 解消（書式化） |
| 7 | Step 1-3 | 運用 | Vercel ↔ Neon integration が git push 検知時に `DATABASE_URL_UNPOOLED` / `NEON_AUTH_BASE_URL` / `VITE_NEON_AUTH_URL` を自動生成。u-balloon コードでは未使用なので無害だが、cleanup 対象には入る | P3（運用知見） | 認知 | 認知済 |
| 8 | Step 8 | 運用 | migrate-points API レスポンス形式が `{summary: {...}, results: [...]}` のネスト形（プロンプト想定はフラット） | P3 | プロンプト v3.2 で jq 修正 | プロンプト修正のみ |
| 9 | Step 10-4 | 運用 | プロンプトの SQL が `total_orders` / `total_spent` を参照するが users テーブルに存在しない（旧 schema） | P3 | プロンプト v3.2 で削除 or schema 確認 SQL 化 | プロンプト修正のみ |
| 10 | 事前準備 | 技術負債 | importMap.js untrack を revert（commit 4efef52）、`payload generate:importmap` 自動化は後日 | P3 | 5 月以降 | 記録のみ |
| 11 | 既知 | 観測 | pg-connection-string SSL mode 将来警告 | P3 | 5 月以降 | 記録のみ |

## 延期判断リミット照合

**ゲート 1 (4/28 24:00 JST) 判定**:

- **P0 issue 件数: 1**（auth-context.tsx 構造バグ → 全ユーザーロックアウト）
- **P1 issue 件数: 2**（51,505 pts data loss、email reject 8 件のデータ品質）
- **現時点判断: POSTPONE_TO_5_7（4/30 切替を 2026-05-07 早朝に延期）**

理由:
1. P0 が完全ロックアウト級。本番切替後に発覚すると 800+ 名の会員が一斉ログイン不能 → 緊急ロールバック必須の事態になる
2. P0 fix は `auth-context.tsx` + `ChangePasswordContent.tsx` の修正に加え、token 保管設計（XSS リスク考慮）の判断が必要 → 数時間〜半日コース
3. 4/28 24:00 までに fix + 再リハーサル + ゲート 1 再判定が現実的に厳しい
4. P1 の 51,505 pts data loss も商品性に直結（顧客のポイント消失 = クレーム）→ CSV クリーニング or convert script dedup 強化が必要

**Daisuke 追加所感**: _________

---

## 次アクション（推奨順）

### 即実施 (Step 12-13 完了後)
1. **P0 fix を別タスク化**: `auth-context.tsx` に token state、すべての fetch に Authorization header、`/account` フローも併せて検証
2. **P1 fix**: CSV 事前クリーニング（重複 legacy_id 集約 + email 修正） or convert-makeshop-csv.ts に dedup ロジック追加
3. **延期決定の通知**: リニューアル案内メール (Phase F) 起草前に延期判断確定 → 文面を 5/7 切替前提に変更

### 4/28 までに
- P0/P1 修正完了 → 同 Neon Launch + Vercel preview で再リハーサル → ゲート 1 再評価 → 5/7 GO/no-go 判断

### 5/7 切替直前
- Phase H 本番切替プロンプト起草（リハーサルの差分: production branch、DNS 切替、smoke test）

