# MakeShop ステージングリハーサル実施結果 — 2026-04-26

## 実施情報
- 実施日: 2026-04-26
- プロンプト版: v3.2 (2026-04-25 リハーサル知見反映版)
- 実施者: Daisuke + Claude Code 自動実行
- Preview URL (initial): https://u-balloon-mpmvr6s5m-urakutours-6576s-projects.vercel.app
- Preview URL (final, after P0 fix): https://u-balloon-oscswjgv2-urakutours-6576s-projects.vercel.app
- Rehearsal Neon branch: rehearsal-2026-04-26 (id: br-shiny-base-a119dx3t)
- Git rehearsal branch: rehearsal/2026-04-26
- 使用 CSV: tmp/rehearsal/member_20260425.csv

## 数値結果

### CSV 変換 (Step 4)
```json
{
  "totalRows": 923,
  "successRows": 824,
  "skippedRows": 1,
  "errorRows": 0,
  "addressParseFailures": 0,
  "genderUnmapped": 0,
  "birthdayInvalid": 0,
  "emailMissing": 1,
  "pointsMigrationCount": 779,
  "pointsMigrationTotal": 336166
}
```

### Import API (Step 5, 6) — fix 後最終結果
```json
{
  "total": 824,
  "created": 824,
  "updated": 0,
  "skipped": 0,
  "errors_count": 0
}
```

### migrate-points API (Step 8) — fix 後最終結果
```json
{
  "total": 779,
  "success": 779,
  "errors_count": 0
}
```

### T2.2 バグ修正検証 (Step 9)
- adjust_count for migrated users: **0** (期待 0) ✓
- db_points vs JSON 一致: **5/5 全 YES** ✓
- migration_count per user: 1 (points あり時) / 0 (points 0 時) ✓
- **検証結果: PASSED** ★

### 認証フロー (Step 10)
- Test user: `komapan2000@yahoo.co.jp` (Daisuke 公認テストアカウント)
- Login: OK (token len=275)
- /api/users/me: `Authorization: JWT <token>` header 必須 (cookie のみは null 返却)
- requirePasswordChange flag: **true** ✓
- change-password redirect: **(a) auto-redirect: YES** ✓
- /account 全フィールド表示: **OK** ✓
- ポイント表示: 55 pt (legacyId=komapan2000)、履歴に「MakeShop移行ポイント」タイプ migration で表示 ✓
- 注文履歴: 空 (移行範囲外で正常) ✓

### データ整合性 (Step 10-4)
- admin_count: 1 ✓
- total_with_legacy: 824
- unique_legacy: 824
- legacyId uniqueness: **TRUE** ✓

## P0 issue 発見 + 即時 fix (リハーサル中対応)

### 発見した P0 issue
**8 件の MakeShop 会員 (`*.docomo.ne.jp`)** が Payload v3 の RFC 準拠 email validation で reject されていた。

該当 8 件:
- `ai....clover-eternity@docomo.ne.jp` (連続ドット `....`)
- `mr.shirakawago...@docomo.ne.jp` (連続ドット + 末尾ドット)
- `i-zu..4.15@docomo.ne.jp` (連続ドット `..`)
- `sharabi-kumi..219@docomo.ne.jp` (連続ドット `..`)
- `hiro.743211.@docomo.ne.jp` (末尾ドット `.@`)
- `yuuuuu--410.@docomo.ne.jp` (末尾ドット `.@`)
- `onlyc2..chocox2.tomodapu--c5@docomo.ne.jp` (連続ドット `..`)
- `eri..1124..ma-chan@docomo.ne.jp` (連続ドット `..`)

ガラケー時代のキャリアメールで MakeShop は allow していたが、Payload v3 default validation (`validations.js` line 107 の正規表現 `(?!.*\.\.)` で連続ドット拒否) で reject されていた。

### 適用した fix (案 D — context-aware loose validation)
- `Users.email.validate` を override
- `req.context.allowLegacyEmailFormat === true` の時だけ loose regex を使用
- 通常の新規登録 (frontend /register) は context flag が無いので **strict 維持**
- `/api/admin/import/customers` route と `/api/admin/migrate-points` route が context にフラグをセット

修正コミット:
- `f7b9ce0`: import endpoint validate override + Users.email validate
- `5b95708`: migrate-points endpoint validate override

### Fix 後の結果
- import: 824/824 created, 0 errors
- migrate-points: 779/779 success, 0 errors
- 8 件の RFC 違反 email ユーザーも全員 DB に正しく作成 + points 移行成功

## 問題リスト (記録のみ)

| # | 発見 Step | カテゴリ | 内容 | 優先度 | 対応フェーズ | ステータス |
|---|---|---|---|---|---|---|
| 1 | Step 5 | P0 (発見時) | RFC 違反 email 8 件 reject | P0 | リハーサル中 | **解消済 (commit f7b9ce0 / 5b95708)** |
| 2 | build log | 観測 | pg-connection-string SSL mode 将来警告 | P2 | Phase H 以降 | 記録のみ |
| 3 | Step 0 事前準備 | 技術負債 | importMap.js untrack 戻し済、generate:importmap 自動化は後日 | P3 | 5月以降 | 記録のみ |
| 4 | Step 5 初回 | observation | API report の `created` カウントが catch block 越しに incremented する集計バグ (false positive 0 件後は再現不可) | P3 | post-launch | 観測のみ |

## 延期判断リミット照合

**ゲート 1 (4/28 24:00 JST) 判定**:
- P0 issue 件数: **0 件** (1 件あったが即時 fix 済 main へ merge する設計で続行)
- P1 issue 件数: 0 件
- 現時点判断: **EXECUTE_4_30** (本番切替予定通り)

ただし fix を rehearsal/2026-04-26 ブランチに留めず **main へ merge** する必要あり (4/30 切替前):
- f7b9ce0 (Users.email validate + import endpoint context)
- 5b95708 (migrate-points endpoint context)
- → 別 PR で main にマージ → production deploy

**Daisuke 追加所感**: _________

## 次のアクション

1. **Phase H 本番切替手順書** 起票 (4/29 まで)
2. **fix を main に merge** する PR (P0 fix を production に反映、4/30 切替前に必須)
3. **Phase F リニューアル案内メール** 4/30 切替後 (移行 824 名 + 古い admin への案内)
4. **production の MakeShop 最新 CSV** 入手と最終 import 準備 (4/29-30)

## 関連ファイル

- conversion report: `tmp/rehearsal/conversion_report_2026-04-26.json`
- import response: `tmp/rehearsal/import_response.json`
- migrate-points response: `tmp/rehearsal/migrate_points_response.json`
- 入力 CSV: `tmp/rehearsal/member_20260425.csv` (824 dedup 後)
- 変換後 import CSV: `tmp/rehearsal/customers_import_2026-04-26.csv`
- 変換後 points JSON: `tmp/rehearsal/points_migration_2026-04-26.json` (779 entries / 336,166 pts)
