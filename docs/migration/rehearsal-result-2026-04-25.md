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
- **現時点判断: EXECUTE_4_30_WITH_FIXES（4/30 切替を維持、Gate 1 で P0/P1 全解消が絶対条件）**

判断根拠（business decision: 4/30 切替マスト）:
1. 4/30 切替は経営判断としてマスト（延期の business cost が技術リスクを上回る）
2. P0 (auth-context.tsx) は影響範囲が明確、修正範囲も 2 ファイル + token 保管設計のみ → 1 日コースで完了可能
3. P1 (51,505 pts data loss) は CSV 事前クリーニング + convert-makeshop-csv.ts dedup 強化で 1 日コース
4. 残 3 日（〜4/28 24:00）で fix → 再リハーサル → Gate 1 再評価が可能
5. Gate 2 (4/30 05:30 JST) で再度 import 開始 30 分検証 → 異常時はロールバック（既存設計通り）

**Daisuke 追加所感**:
- 4/30 切替は business priority。延期不可。P0/P1 を 4/28 24:00 までに fix し、再リハーサル成功で Gate 1 通過する。
- P0 fix の token 保管設計は **localStorage + httpOnly cookie 並列**の最小修正で先行（XSS リスクは 4/30 切替後の本格セキュリティレビューで再評価）。
- P1 fix は **convert-makeshop-csv.ts に legacy_id dedup ロジック追加** を主案、CSV 事前クリーニングは MakeShop 側の export 仕様次第で副案。
- リニューアル案内メール (Phase F) は 4/28-29 起草、4/30 切替前提のまま進める。

---

## 次アクション（4/30 切替維持の前提、3 日スケジュール）

### Phase 1: P0 fix（2026-04-26 午前完了目標）
1. `src/lib/auth-context.tsx` に `token` state 追加
   - login で `data.token` を保存
   - localStorage 永続化（リロード後も保持）
   - context value に `token` を expose
2. すべての `fetch` に `Authorization: JWT ${token}` header を追加（`refreshUser`, `logout`, `register`）
3. `src/app/(frontend)/change-password/ChangePasswordContent.tsx` の PATCH に Authorization header 追加
4. ローカル動作確認 → unit test （存在すれば）→ feature branch + PR

### Phase 2: P1 fix（2026-04-26 夕方完了目標）
1. `scripts/convert-makeshop-csv.ts` に legacy_id dedup ロジック追加
   - 同一 legacy_id 行の最終出現を採用（or 最初の出現）
   - points は集約（max / sum / 最終のいずれかを Daisuke 確認）
   - email validation を pre-check で実施（API reject に頼らない）
2. CSV 再エクスポートが必要か Daisuke 判断（MakeShop 側で重複が解消できる場合は CSV 側で対応）
3. ローカルで convert script の閾値テスト → feature branch + PR

### Phase 3: 再リハーサル（2026-04-27〜28 午前）
- prompt-2 v3.2 として更新（Vercel bypass token 必須化、env quote 必須化、jq クエリ修正、SQL schema 修正）
- 同 Neon Launch + Vercel preview で 13 Step 完走
- T2.2 PASS 維持 + P0/P1 解消確認

### Phase 4: Gate 1 再評価（2026-04-28 24:00 JST）
- P0 件数 = 0、P1 件数 = 0 を絶対条件
- 達成 → EXECUTE_4_30 確定
- 未達成 → 緊急延期判断（POSTPONE_TO_5_7）

### Phase 5: 本番切替（2026-04-29 メール → 4/30 早朝 DNS 切替）
- 4/28-29: Phase F リニューアル案内メール起草・送信（4/30 切替前提のまま）
- 4/30 早朝: Phase H 本番切替プロンプト実行
- Gate 2 (05:30 JST): import 30 分時点で異常検出 → ロールバック設計は既存通り

