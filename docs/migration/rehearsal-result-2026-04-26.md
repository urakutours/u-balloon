# MakeShop ステージングリハーサル v2 実施結果 — 2026-04-26

> **前回 (v1, 2026-04-25) の P0/P1 を fix 後の再リハーサル**
> v1 結果: docs/migration/rehearsal-result-2026-04-25.md
> 使用 prompt: docs/prompts/active/prompt-2-makeshop-rehearsal-v3.2.md

## 実施情報

- **実施日**: 2026-04-26（深夜実施）
- **実施者**: Daisuke + Claude Code 自動実行
- **本番切替予定**: 2026-04-30 05:00-07:00 JST
- **Preview URL**: https://u-balloon-g7eno5g5d-urakutours-6576s-projects.vercel.app
- **Rehearsal Neon branch**: rehearsal-2026-04-26 (`br-divine-frost-a16fp6ty`)
- **使用 CSV**: tmp/rehearsal/member_20260425.csv（v1 と同一、924 行）
- **基準 commit**: cdaa83b (PR #5 v3.2 prompt) on main
- **Phase 1 (PR #2)**: auth-context.tsx に token state + authFetch wrapper、customer-facing 6 ファイル
- **Phase 2 (PR #3)**: convert-makeshop-csv.ts に email-based dedup + points 合算

## 数値結果

### CSV 変換 (Step 4)

```json
{"totalRows":923,"successRows":824,"skippedRows":1,"errorRows":0,"dedupedRows":98,"emailMissing":1,"emailInvalid":0,"duplicateEmails":82,"pointsMigrationCount":779,"pointsMigrationTotal":336166}
```

**v2 改善点**: dedupedRows=98 (v1: 0)、duplicateEmails=82 グループ検出。閾値判定 PASSED。

### Import API (Step 5, 6)

```json
{"total":824,"created":816,"updated":0,"skipped":0,"errors_count":8}
```

- DB 反映: 816 件、legacy_id 完全 unique
- **created+updated+errors = 824**: 整合 ✓
- **updated=0** (v1: 98) ← Phase 2 dedup 完全効果

### migrate-points API (Step 8, 9)

```json
{"total":779,"success":771,"errors":8}
```

- type='migration': 771 件、type='adjust': **0** ← T2.2 維持
- DB 反映 sum: 332752 pts（v1: 284,661）
- **失われた points: 3414 pts (retention 99.0%)** ← v1: 51,505 pts (84.7%)

### T2.2 バグ修正検証 (Step 9)

- Sample 3 users: 全員 migration_count=1, **adjust_count=0** ✓
- Global adjust for migrated: **0** ✓
- db_points vs JSON: 全 5 件 match=YES ✓
- **検証結果: PASSED** ✅ (v1 から維持)

### 認証フロー (Step 10) — **Phase 1 P0 fix の決定的検証**

- admin login: ✓
- test user login (`tanaso221323@yahoo.co.jp` / `Temp1234!`): ✓
- /api/users/me (cookie + Authorization 両送信): ✓ has_user=true, requirePasswordChange=true
- **/change-password 自動 redirect**: YES (Daisuke 確認)
- **/change-password でパスワード変更**: ✅ **SUCCESS** (v1: ❌ 「許可されていません」)
- DB 確認: requirePasswordChange: true → false、passwordChangedAt 記録 ✓
- /account 表示: 氏名/フリガナ/メール/電話/郵便/住所 すべて OK

### データ整合性 (Step 10-4)

- admin_count: 1 ✓
- legacyId uniqueness: 816 = 816 unique ✓
- requirePasswordChange 分布: true=815, false=1 (test user)

---

## v1 → v2 改善サマリー

| 項目 | v1 (4/25) | v2 (4/26) | 改善 |
|---|---|---|---|
| **P0 /change-password** | 全ユーザーロックアウト | ✅ **完走** | 解消 |
| **P1 失われた points** | 51,505 pts (15.3%) | **3414 pts (1.0%)** | ⭐ **93.4% 削減** |
| **P1 retention** | 84.7% | **99.0%** | +14.3pt |
| Import created | 816 | 816 | 同 |
| Import updated | 98 | **0** | dedup 効果 |
| Import errors | 8 | 8 | (残課題、後述) |
| migrate-points success | 764 | **771** | +7 |
| migrate-points errors | 104 | **8** | -96 |
| T2.2 adjust=0 | PASSED | PASSED | 維持 |
| Vercel bypass | (発見) | 事前準備済 | 運用化 |
| env quote | (発見) | 必須化 | 運用化 |

---

## 残存 issue

| # | カテゴリ | 内容 | 優先度 | 対応 |
|---|---|---|---|---|
| 1 | データ品質 | API 側 email validation で reject される 8 件 (row 180/320/349/399/613...) — convert script の EMAIL_REGEX より API 側が厳格 | **P2** (was P1) | 4/29 までに CSV クリーニング or convert の正規表現を Payload v3 に揃える |
| 2 | 観測 | 失われた 3,414 pts は #1 の 8 件分の points のみ (8 user × 平均 ~427 pts) | P2 | #1 解決で同時解消 |
| 3 | 運用 | admin 系 fetch (約 20 箇所) の cookie-only 認証は手付かず | P3 | 4/30 切替後の本格セキュリティレビューで対応 |
| 4 | 既知 | importMap.js 自動生成の本格対応 | P3 | 5月以降 |

---

## 延期判断リミット照合

**ゲート 1 (4/28 24:00 JST) 判定**:

- **P0 件数: 0** ✅
- **P1 件数: 0** ✅
- **P2 件数: 1** (email validation reject 8 件、business 影響軽微)
- **判断: EXECUTE_4_30** ← 本番切替 GO 推奨

理由:
1. P0 完全解消（Phase 1 fix 動作確認）
2. P1 retention 99.0%（business 許容範囲）
3. 残 P2 は 8 件分の手動対応（CSV クリーニング or 顧客 CS 対応）で 4/29 までに完了可能

**Daisuke 追加所感**: _________

---

## 次アクション

### 4/26 (今日) - 4/27
- [ ] PR review and merge (実施済み)
- [ ] このリハーサル結果を docs/migration/ に commit (Step 12 後)
- [ ] CSV email reject 8 件の個別対応方針確定（手動修正 or 顧客連絡）

### 4/28 (Gate 1)
- [ ] 24:00 JST Gate 1 最終判定 → EXECUTE_4_30 確定 (or 緊急延期)
- [ ] Phase F リニューアル案内メール起草

### 4/29
- [ ] Phase F メール送信
- [ ] Phase H 本番切替プロンプト起草

### 4/30 早朝 (Phase H 本番切替)
- [ ] 05:00-07:00 JST DNS 切替実行
- [ ] Gate 2 (05:30): import 30分時点で異常検出 → ロールバック設計

