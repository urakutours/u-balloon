# プロンプト 2: MakeShop ステージングリハーサル実施 (確定版 v3.2)

> **作成日**: 2026-04-26 (v3.2: 2026-04-25 リハーサル知見を反映)
> **想定実施日**: 2026-04-27 〜 2026-04-28（4/30 切替維持の場合、Gate 1 までに完走）
> **本番切替予定**: 2026-04-30 05:00-07:00 JST
> **関連**: `u-balloon/docs/migration/rehearsal-result-2026-04-25.md` (前回リハーサル結果)
>
> 本プロンプトは Claude Code が可能な限り自動実行する設計。Daisuke 手動は「事前準備」「各 Step 境界応答」「/account UI 目視 1 件」「最終判断」のみ。
>
> **v3.1 → v3.2 変更点（2026-04-25 リハーサルの教訓を反映）**:
> 1. **Vercel Protection Bypass for Automation token を事前準備に追加** (Section 0.0.7) — preview deployment は protection で 401 Unauthorized になり curl 全弾。bypass header 必須化。
> 2. **`.env.rehearsal` の URL 系はシングルクォート必須** (Section 0.0.5) — Neon connection string の `&channel_binding=...` が unquoted で `source` 時に bash の background-job 演算子と解釈され値が消える問題。
> 3. **migrate-points API レスポンスは `{summary: {...}, results: [...]}` ネスト形** (Step 8) — v3.1 のフラット想定 jq クエリを修正。
> 4. **Step 10-4 SQL から `total_orders` / `total_spent` 削除** — users テーブルに該当カラムなし（旧 schema）。
> 5. **Step 6 で dedup 後の数値整合性を強化** — PR #3 (CSV email dedup + points 合算) 後の expected: created=824 / updated=0 / errors≈1 / migrated_users=824 / pts=336,166。
> 6. **Step 12 cleanup に bypass secret revoke を追記**。
>
> **前回 (v3.1) で発見済の P0/P1 fix が前提**:
> - PR #2 (P0): `auth-context.tsx` に token state + authFetch wrapper、customer-facing 6 ファイル修正
> - PR #3 (P1): `convert-makeshop-csv.ts` に email-based dedup + points 合算
> - これらが main に merge された状態で再リハーサル実施

---

## 0. 事前完了必須タスク (Daisuke 先行、本プロンプト実行前)

### 0.0.1. importMap.js / build script の状態確認 (済んでいるはず)

- `src/app/(payload)/admin/importMap.js` が **git tracked** であること
- `package.json` の build script が `node scripts/patch-payload-paginator.mjs && next build`
- Vercel Dashboard で最新 production deployment が **Ready**

> **背景**: 当初 untrack された importMap.js が Vercel build 失敗の原因だった。`payload generate:importmap` での自動生成は payload.config.ts の TypeScript ESM resolution 問題で動作不良。安全策として tracked に戻した。後日(MakeShop 移行完了後)再検討予定。

### 0.0.2. Neon Launch プラン昇格
- Free → Launch プラン(月 $19)、History retention 24h → **7 days**

### 0.0.3. MakeShop raw CSV の入手・配置
- `C:/dev/uballoon/u-balloon/tmp/rehearsal/makeshop-export.tsv` に配置

### 0.0.4. ステージング用 Resend API キー発行
- Resend Dashboard で `rehearsal-2026-04-24` 名義の新規 API キー発行

### 0.0.5. `.env.rehearsal` 作成 (最重要)

`u-balloon/.env.rehearsal` を作成。`.gitignore` に `.env.rehearsal` または `*.rehearsal` が含まれていることを確認(commit `4581ec1` で対応済み)。

> ⚠ **v3.2 重要事項**: 値に `&` や特殊文字を含む URL 系（Neon connection、`?sslmode=require&channel_binding=require` を含む URL 等）は **必ずシングルクォートで囲む**こと。クォートなしだと `source .env.rehearsal` 時に bash が `&` を background-job 演算子として解釈し、変数値が途中で打ち切られる（前回リハーサルで `psql` 無限ハングの原因になった）。

```bash
# ===== Neon =====
NEON_API_KEY=neon_api_xxxxxxxxxxxxxx
NEON_PROJECT_ID=xxxxxxxx
NEON_PRODUCTION_BRANCH_ID=br-icy-bar-a1bwijql

# ===== Vercel =====
VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxx
VERCEL_PROJECT_ID=prj_xxxxxxxxxxxxxxxx
VERCEL_TEAM_ID=                               # 個人アカウントなら空欄

# ===== Vercel Protection Bypass (v3.2 NEW) =====
# Section 0.0.7 で生成、preview の Deployment Protection を抜けるため curl で必須
VERCEL_AUTOMATION_BYPASS_SECRET=                # 32 文字、hex random

# ===== Payload admin credentials =====
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=xxxxxxxxxxxx

# ===== Resend =====
RESEND_API_KEY_REHEARSAL=re_xxxxxxxxxxxxxx

# ===== リハーサル固有 =====
REHEARSAL_DATE=2026-04-27
REHEARSAL_CSV_PATH=tmp/rehearsal/makeshop-export.csv

# ===== ⚠ URL 系はシングルクォート必須（後段の Step 1 で append される変数も同様） =====
# 例:
# DATABASE_URL='postgresql://user:pass@host/db?sslmode=require&channel_binding=require'
# REHEARSAL_DB_URL_SECRET='postgresql://...?sslmode=require&channel_binding=require'
```

### 0.0.6. 必須 CLI ツール

```bash
psql --version    # PostgreSQL client (Step 2/3/6/9/10 で必須)
curl --version
jq --version
git --version
node --version    # v20+
pnpm --version
```

`psql` は `winget install PostgreSQL.PostgreSQL.17` で導入(管理者権限必要)。インストール後 PATH が通っていなければ `export PATH="$PATH:/c/Program Files/PostgreSQL/17/bin"`。

### 0.0.7. Vercel Protection Bypass for Automation token 生成 (v3.2 NEW)

Vercel preview deployment は **Deployment Protection (Vercel Authentication)** で保護されており、bypass token なしでは curl が全件 401 Unauthorized で弾かれる（前回リハーサルでの最大ハマりポイント）。

**手順（Vercel Dashboard 操作、約 2 分）**:

1. Vercel Dashboard → `u-balloon` プロジェクト → **Settings** → **Deployment Protection**
2. 下部の **「Protection Bypass for Automation」** セクションで **「+ Add」** をクリック
3. ダイアログで以下を入力:
   - **Secret**: 32 文字の hex random（生成方法: `openssl rand -hex 16`）
   - **Note**: `rehearsal-${REHEARSAL_DATE}`（例: `rehearsal-2026-04-27`）
4. **Add** → secret をコピー
5. ターミナルで `.env.rehearsal` に追記:
   ```bash
   echo "VERCEL_AUTOMATION_BYPASS_SECRET=$(openssl rand -hex 16)" >> .env.rehearsal
   # または Dashboard で生成した値を貼り付け
   ```

**使い方**: 全 curl リクエストに header `-H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}"` を付ける。

**注意**: Step 12 cleanup の最後に Daisuke が手動で **revoke** することを忘れずに（Dashboard の同セクションで Delete）。

---

## 延期判断リミット (案 α = ダブルゲート型)

**ゲート 1 — 4/28 24:00 JST**
リハーサル P0/P1 issue が 1 件でも未解決なら 4/30 切替を **2026-05-07 早朝** へ延期。

**ゲート 2 — 4/30 05:30 JST**
本番 import 開始後 30 分時点で (a) API エラー停止 / (b) 検証不整合 / (c) インフラ障害のいずれかなら即 DNS 切替中止 + Phase H ロールバック。
DNS 切替実行後(06:00 JST 以降)は smoke test を優先。

**Daisuke 調整欄**: _________

---

## 1. 実行モデル

- **Claude Code 自動実行中心**
- **Hard-stop gate**: 各 Step 末尾で STOP、Daisuke の `done, proceed step N` で次へ
- **機密情報**: `.env.rehearsal` から `source` 読み込み、ログには値を出さない
- **確定済み値**:
  - Neon DB = `neondb`, role = `neondb_owner`
  - import endpoint = `/api/admin/import/customers`
  - migrate-points endpoint = `/api/admin/migrate-points`
- **認証**: Payload の ImportExportPage は client-side で cookie 依存、curl では cookie + Authorization header 両方送る
- **Vercel Protection Bypass**: **すべての curl リクエストに `-H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}"` を付ける**（v3.2 必須、未付与は 401 Unauthorized）
- **Daisuke 手動**: 事前準備 / Step 境界応答 / Step 10-3 UI 目視 / 最終判断のみ

---

## Step 0: 前提条件検証 + 環境変数読み込み (Claude Code)

### 0-1. 環境変数読み込み

```bash
cd C:/dev/uballoon/u-balloon
set -a
source .env.rehearsal
set +a

for v in NEON_API_KEY NEON_PROJECT_ID NEON_PRODUCTION_BRANCH_ID VERCEL_TOKEN VERCEL_PROJECT_ID VERCEL_AUTOMATION_BYPASS_SECRET ADMIN_EMAIL ADMIN_PASSWORD RESEND_API_KEY_REHEARSAL REHEARSAL_DATE REHEARSAL_CSV_PATH; do
  if [ -z "${!v}" ]; then echo "MISSING: $v"; fi
done

# v3.2: bypass secret の長さ check（32 chars 期待）
if [ ${#VERCEL_AUTOMATION_BYPASS_SECRET} -ne 32 ]; then
  echo "WARNING: VERCEL_AUTOMATION_BYPASS_SECRET length=${#VERCEL_AUTOMATION_BYPASS_SECRET}, expected 32"
fi
```

### 0-2. git / ファイル状態確認

```bash
git branch --show-current   # 期待: main
git status                   # 期待: clean
git log --oneline -10

# 必須ファイル存在確認 (path は実体に合わせて修正済み)
test -f "${REHEARSAL_CSV_PATH}" && echo "CSV OK" || echo "CSV MISSING"
test -f "scripts/convert-makeshop-csv.ts" && echo "convert script OK" || echo "convert script MISSING"
test -f "src/app/(frontend)/api/admin/import/customers/route.ts" && echo "import endpoint OK" || echo "import endpoint MISSING"
test -f "src/app/(frontend)/api/admin/migrate-points/route.ts" && echo "migrate-points endpoint OK" || echo "migrate-points endpoint MISSING"

# importMap.js は tracked であること(v3.1 で追加された確認)
git ls-files --error-unmatch "src/app/(payload)/admin/importMap.js" > /dev/null 2>&1 \
  && echo "importMap.js TRACKED OK" \
  || echo "importMap.js MISSING from git tracking"

# build script は revert 後の形であること
grep -q '"build": "node scripts/patch-payload-paginator.mjs && next build"' package.json \
  && echo "build script OK" \
  || echo "build script UNEXPECTED — verify package.json"

# .env.rehearsal が gitignore でカバーされていること
grep -qE "\.env\.rehearsal|\*\.rehearsal" .gitignore \
  && echo "env gitignore OK" \
  || echo "env gitignore MISSING — secrets may leak"

# CLI tools
psql --version > /dev/null 2>&1 && echo "psql OK" || echo "psql MISSING"
jq --version > /dev/null 2>&1 && echo "jq OK" || echo "jq MISSING"
```

### 0-3. import / migrate-points endpoint の認証方式確認

```bash
grep -nE "req\.user|getAuth|cookies\(\)|headers\(\)\.get\(['\"]authorization" \
  "src/app/(frontend)/api/admin/import/customers/route.ts" \
  "src/app/(frontend)/api/admin/migrate-points/route.ts" | head -20
```

判定:
- `req.user` 参照 → Payload 組み込み auth(cookie + header どちらも受理)
- `cookies()` 直接参照 → cookie auth 専用
- `headers().get('authorization')` → Authorization header 専用

v3.1 では **cookie + Authorization 両方送信** で書いてあるため、どちらでも通る前提。確認のみ。

### 0-4. ブロッカー仕分け + Daisuke 応答待ち

Step 0-1 〜 0-3 で 1 件でも MISSING / UNEXPECTED があれば、**ブロッカー一覧表** で報告し Daisuke 判断を仰ぐ:

```
🛑 BLOCKERS DETECTED:

| # | 項目 | 状態 | 必要な対応 |
|---|---|---|---|
| B1 | [項目名] | [状態] | [Daisuke が何をすべきか] |

確認できた事項:
- [✅ 項目]
- [✅ 項目]

推奨アクション順:
1. [最優先]
2. [次]

すべて解消したら proceed step 0 で再開します。
```

全 OK の場合:

```
Step 0 complete. All preconditions verified.
Auth style detected for endpoints: <cookie/header/both>

External preconditions (please confirm):
- Vercel production deployment currently Ready? (yes/no)
- Neon Launch plan active, retention = 7 days? (yes/no)

If all yes, reply: "done, proceed step 1"
```

---

## Step 1: Neon + Git + Vercel Preview 全自動構築 (Claude Code)

### 1-1. Neon リハーサルブランチ作成

```bash
source .env.rehearsal

REHEARSAL_BRANCH_NAME="rehearsal-${REHEARSAL_DATE}"

NEON_RESPONSE=$(curl -s -X POST \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
  -H "Authorization: Bearer ${NEON_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"branch\": {
      \"name\": \"${REHEARSAL_BRANCH_NAME}\",
      \"parent_id\": \"${NEON_PRODUCTION_BRANCH_ID}\"
    },
    \"endpoints\": [{\"type\": \"read_write\"}]
  }")

REHEARSAL_BRANCH_ID=$(echo "$NEON_RESPONSE" | jq -r '.branch.id')

if [ "$REHEARSAL_BRANCH_ID" = "null" ] || [ -z "$REHEARSAL_BRANCH_ID" ]; then
  echo "BRANCH CREATION FAILED. Response: $(echo "$NEON_RESPONSE" | jq -c .)"
  exit 1
fi

# Connection string 取得 (pooled, neondb / neondb_owner はスクリーンショット確認済)
NEON_CONN_RESPONSE=$(curl -s -G \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/connection_uri" \
  --data-urlencode "branch_id=${REHEARSAL_BRANCH_ID}" \
  --data-urlencode "database_name=neondb" \
  --data-urlencode "role_name=neondb_owner" \
  --data-urlencode "pooled=true" \
  -H "Authorization: Bearer ${NEON_API_KEY}")

REHEARSAL_DB_URL=$(echo "$NEON_CONN_RESPONSE" | jq -r '.uri')

echo "REHEARSAL_BRANCH_ID=${REHEARSAL_BRANCH_ID}" >> .env.rehearsal
echo "REHEARSAL_DB_URL_SECRET=${REHEARSAL_DB_URL}" >> .env.rehearsal

echo "Neon branch created: ${REHEARSAL_BRANCH_NAME} (id: ${REHEARSAL_BRANCH_ID})"
```

### 1-2. Git リハーサルブランチ作成 + push

```bash
git checkout main
git pull origin main
git checkout -b "rehearsal/${REHEARSAL_DATE}"
git commit --allow-empty -m "chore: trigger rehearsal preview deployment for ${REHEARSAL_DATE}"
git push origin "rehearsal/${REHEARSAL_DATE}"
```

### 1-3. Vercel Preview env var override

```bash
source .env.rehearsal

GIT_BRANCH="rehearsal/${REHEARSAL_DATE}"
REHEARSAL_DB_URL=$(grep "^REHEARSAL_DB_URL_SECRET=" .env.rehearsal | cut -d= -f2-)

TEAM_QUERY=""
if [ -n "${VERCEL_TEAM_ID}" ]; then
  TEAM_QUERY="?teamId=${VERCEL_TEAM_ID}"
fi

# DATABASE_URL を branch-specific で登録
curl -s -X POST \
  "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${TEAM_QUERY}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"DATABASE_URL\",
    \"value\": \"${REHEARSAL_DB_URL}\",
    \"type\": \"encrypted\",
    \"target\": [\"preview\"],
    \"gitBranch\": \"${GIT_BRANCH}\"
  }" | jq '.key // .error'

# RESEND_API_KEY も branch-specific で上書き
curl -s -X POST \
  "https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env${TEAM_QUERY}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"key\": \"RESEND_API_KEY\",
    \"value\": \"${RESEND_API_KEY_REHEARSAL}\",
    \"type\": \"encrypted\",
    \"target\": [\"preview\"],
    \"gitBranch\": \"${GIT_BRANCH}\"
  }" | jq '.key // .error'

echo "Vercel env vars set for branch ${GIT_BRANCH}"

# env var 変更を反映するため再デプロイトリガー
git commit --allow-empty -m "chore: trigger redeploy after env var override"
git push origin "${GIT_BRANCH}"
```

### 1-4. Preview Ready 待ち (最大 5 分 poll)

```bash
source .env.rehearsal
TEAM_QUERY=""
if [ -n "${VERCEL_TEAM_ID}" ]; then TEAM_QUERY="&teamId=${VERCEL_TEAM_ID}"; fi

PREVIEW_URL=""
for i in {1..30}; do
  DEPLOY_JSON=$(curl -s \
    "https://api.vercel.com/v6/deployments?projectId=${VERCEL_PROJECT_ID}&limit=5&target=preview${TEAM_QUERY}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}")

  LATEST_STATE=$(echo "$DEPLOY_JSON" | jq -r ".deployments[] | select(.meta.githubCommitRef == \"rehearsal/${REHEARSAL_DATE}\") | .state" | head -1)
  LATEST_URL=$(echo "$DEPLOY_JSON" | jq -r ".deployments[] | select(.meta.githubCommitRef == \"rehearsal/${REHEARSAL_DATE}\") | .url" | head -1)

  echo "Attempt $i: state=${LATEST_STATE}"

  if [ "$LATEST_STATE" = "READY" ]; then
    PREVIEW_URL="https://${LATEST_URL}"
    echo "PREVIEW_URL=${PREVIEW_URL}" >> .env.rehearsal
    echo "Ready: ${PREVIEW_URL}"
    break
  fi

  if [ "$LATEST_STATE" = "ERROR" ] || [ "$LATEST_STATE" = "CANCELED" ]; then
    echo "Build FAILED/CANCELED. Check Vercel dashboard for logs."
    exit 1
  fi

  sleep 10
done

if [ -z "$PREVIEW_URL" ]; then
  echo "TIMEOUT: deployment did not become READY within 5 minutes"
  exit 1
fi
```

### STOP 指示

```
Step 1 complete.
- Neon branch: rehearsal-${REHEARSAL_DATE} (id: ${REHEARSAL_BRANCH_ID})
- Git branch: rehearsal/${REHEARSAL_DATE} pushed
- Vercel env vars: DATABASE_URL + RESEND_API_KEY set for branch
- Preview URL: ${PREVIEW_URL}
- Deployment state: READY

Reply: "done, proceed step 2"
```

---

## Step 2: Preview URL 到達確認 + rehearsal branch 初期状態確認 (Claude Code)

```bash
source .env.rehearsal

# Preview URL ヘルスチェック
curl -sI "${PREVIEW_URL}/admin" | head -1
curl -s "${PREVIEW_URL}/api/access" | jq '. | keys' 2>/dev/null || echo "access endpoint check failed"

# rehearsal branch の初期 count (production のコピー)
psql "${REHEARSAL_DB_URL_SECRET}" -c "
  SELECT
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admin_users,
    (SELECT COUNT(*) FROM users WHERE role != 'admin') AS non_admin_users,
    (SELECT COUNT(*) FROM point_transactions) AS point_transactions;
"
```

### STOP 指示

```
Step 2 complete.
Preview reachable: /admin returned <status>
Rehearsal branch initial: users=N (admin=A, non-admin=M), point_transactions=K

Reply: "done, proceed step 3"
```

---

## Step 3: リハーサル DB テストデータ削除 (Claude Code)

```bash
source .env.rehearsal

psql "${REHEARSAL_DB_URL_SECRET}" <<'SQL'
BEGIN;
DELETE FROM point_transactions;
DELETE FROM users WHERE role != 'admin';

SELECT
  (SELECT COUNT(*) FROM users) AS users_after,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') AS admin_after,
  (SELECT COUNT(*) FROM point_transactions) AS pt_after;
COMMIT;
SQL
```

### STOP 指示

```
Step 3 complete. users=A (all admin), point_transactions=0
Reply: "done, proceed step 4"
```

---

## Step 4: MakeShop CSV 変換 (Claude Code)

```bash
source .env.rehearsal

# v3.1 修正: scripts/ (src/scripts/ ではない)
npx tsx scripts/convert-makeshop-csv.ts "${REHEARSAL_CSV_PATH}" --out-dir ./tmp/rehearsal 2>&1 | tee tmp/rehearsal/convert.log

ls -la tmp/rehearsal/customers_import_*.csv tmp/rehearsal/points_migration_*.json tmp/rehearsal/conversion_report_*.json

REPORT_FILE=$(ls -t tmp/rehearsal/conversion_report_*.json | head -1)

jq '{
  totalRows, successRows, skippedRows, errorRows,
  addressParseFailures: (.addressParseFailures | length),
  genderUnmapped: (.genderUnmapped | length),
  birthdayInvalid: (.birthdayInvalid | length),
  emailMissing: (.emailMissing | length),
  pointsMigrationCount, pointsMigrationTotal
}' "$REPORT_FILE"

CSV_FILE=$(ls -t tmp/rehearsal/customers_import_*.csv | head -1)
head -1 "$CSV_FILE" | tr ',' '\n' | nl
```

### 閾値判定

`errorRows > totalRows * 0.05` または `skippedRows > totalRows * 0.1` → STOP。

### STOP 指示

```
Step 4 complete.
Conversion report: [table]
CSV: 16 columns OK
Error threshold: PASSED / EXCEEDED
Reply: "done, proceed step 5"
```

---

## Step 5: Admin token 取得 + CSV import API 実行 (Claude Code)

### 5-1. Admin token 取得

```bash
source .env.rehearsal

LOGIN_RESPONSE=$(curl -s -X POST "${PREVIEW_URL}/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${ADMIN_EMAIL}\", \"password\": \"${ADMIN_PASSWORD}\"}")

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "LOGIN FAILED. Response: $(echo "$LOGIN_RESPONSE" | jq -c '{errors, message}')"
  exit 1
fi

echo "ADMIN_TOKEN_SECRET=${ADMIN_TOKEN}" >> .env.rehearsal
echo "Admin token acquired (not printed)"
```

### 5-2. CSV import API 呼び出し

**確定 endpoint**: `POST /api/admin/import/customers`
**認証方式**: cookie + Authorization header 両方送信

```bash
source .env.rehearsal

CSV_FILE=$(ls -t tmp/rehearsal/customers_import_*.csv | head -1)
ADMIN_TOKEN=$(grep "^ADMIN_TOKEN_SECRET=" .env.rehearsal | cut -d= -f2-)

IMPORT_RESPONSE=$(curl -s -X POST "${PREVIEW_URL}/api/admin/import/customers" \
  -b "payload-token=${ADMIN_TOKEN}" \
  -H "Authorization: JWT ${ADMIN_TOKEN}" \
  -F "file=@${CSV_FILE};type=text/csv")

echo "$IMPORT_RESPONSE" > tmp/rehearsal/import_response.json
echo "$IMPORT_RESPONSE" | jq '{
  total,
  created,
  updated,
  skipped,
  errors_count: (.errors | length // 0),
  first_errors: (.errors[:3] // null)
}'
```

### 5-3. Fallback

レスポンスが `{ "errors": [...], "message": "Forbidden" }` 等なら STOP:

```
STOP. Import API returned unexpected response.
Response: <jq output>

Options:
  (A) Re-inspect route.ts auth logic and adjust curl
  (B) Manual CSV upload via browser at ${PREVIEW_URL}/admin → ImportExportPage

Daisuke, please choose: (A) or (B).
```

### STOP 指示 (正常時)

```
Step 5 complete.
Import summary: total=N, created=N, updated=N, skipped=N, errors=N
First errors (if any): [array of max 3]
Response saved to tmp/rehearsal/import_response.json

Reply: "done, proceed step 6"
```

---

## Step 6: Import 結果検証 SQL (Claude Code)

```bash
source .env.rehearsal

psql "${REHEARSAL_DB_URL_SECRET}" -c "
  SELECT COUNT(*) AS migrated_users_count
  FROM users WHERE legacy_id IS NOT NULL;
"

psql "${REHEARSAL_DB_URL_SECRET}" -c "
  SELECT
    legacy_id, email,
    name, name_kana, phone, mobile_phone,
    gender, birthday, newsletter_subscribed,
    postal_code, prefecture, address_line1, address_line2, default_address,
    legacy_registered_at,
    (legacy_data->>'source') AS legacy_source,
    (legacy_data->>'requirePasswordChange')::boolean AS require_pw_change,
    points
  FROM users
  WHERE legacy_id IS NOT NULL
  ORDER BY RANDOM()
  LIMIT 5;
"

psql "${REHEARSAL_DB_URL_SECRET}" -c "
  SELECT COUNT(*) AS users_with_nonzero_points
  FROM users WHERE legacy_id IS NOT NULL AND points != 0;
"
```

### STOP 指示

```
Step 6 complete.
Migrated users SQL count: N
Sample 5 users: [field verification summary]
Users with non-zero points before migration: N (expected 0)

Reply: "done, proceed step 7"
```

---

## Step 7: Resend API で welcome email 送信履歴確認 (Claude Code)

```bash
source .env.rehearsal

RESEND_EMAILS=$(curl -s "https://api.resend.com/emails?limit=100" \
  -H "Authorization: Bearer ${RESEND_API_KEY_REHEARSAL}")

WINDOW_START=$(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-30M +%Y-%m-%dT%H:%M:%SZ)

RECENT_COUNT=$(echo "$RESEND_EMAILS" | jq --arg ws "$WINDOW_START" \
  '[.data[] | select(.created_at > $ws)] | length')

echo "Emails sent via rehearsal Resend key in last 30 min: $RECENT_COUNT"

echo "$RESEND_EMAILS" | jq --arg ws "$WINDOW_START" \
  '[.data[] | select(.created_at > $ws) | {created_at, to, subject}]'
```

### 判定
- `RECENT_COUNT = 0`: **skipWelcomeEmail PASSED**
- 1 件以上 welcome 系 subject あり: **P0 issue** → STOP

### STOP 指示

```
Step 7 complete.
Welcome emails during import window: N (expected 0)
Breakdown: [recent emails]
skipWelcomeEmail verification: PASSED / FAILED

Reply: "done, proceed step 8"
```

---

## Step 8: migrate-points API 実行 (Claude Code)

**確定 endpoint**: `POST /api/admin/migrate-points`

```bash
source .env.rehearsal

POINTS_JSON=$(ls -t tmp/rehearsal/points_migration_*.json | head -1)
ADMIN_TOKEN=$(grep "^ADMIN_TOKEN_SECRET=" .env.rehearsal | cut -d= -f2-)

jq '.[0:2]' "$POINTS_JSON"

MIGRATE_RESPONSE=$(curl -s -X POST "${PREVIEW_URL}/api/admin/migrate-points" \
  -H "x-vercel-protection-bypass: ${VERCEL_AUTOMATION_BYPASS_SECRET}" \
  -b "payload-token=${ADMIN_TOKEN}" \
  -H "Authorization: JWT ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @"$POINTS_JSON")

echo "$MIGRATE_RESPONSE" > tmp/rehearsal/migrate_points_response.json

# v3.2: response 形式が {summary: {...}, results: [...]} のネスト形になっている
echo "$MIGRATE_RESPONSE" | jq '{
  total: .summary.total,
  success: .summary.success,
  errors_count: .summary.errors,
  first_errors: ([.results[] | select(.status == "error")] | .[:3])
}'
```

### STOP 指示

```
Step 8 complete.
migrate-points summary: total=N, success=N, errors=N
First errors (if any): [array]
Reply: "done, proceed step 9"
```

---

## Step 9: T2.2 バグ修正核心検証 (Claude Code) ★最重要

```bash
source .env.rehearsal
POINTS_JSON=$(ls -t tmp/rehearsal/points_migration_*.json | head -1)

psql "${REHEARSAL_DB_URL_SECRET}" <<'SQL'
WITH sample_users AS (
  SELECT u.id, u.legacy_id, u.points AS db_points
  FROM users u
  WHERE u.legacy_id IS NOT NULL
  ORDER BY RANDOM()
  LIMIT 3
)
SELECT
  s.legacy_id,
  s.db_points,
  (SELECT COUNT(*) FROM point_transactions pt WHERE pt.user_id = s.id AND pt.type = 'migration') AS migration_count,
  (SELECT COUNT(*) FROM point_transactions pt WHERE pt.user_id = s.id AND pt.type = 'adjust') AS adjust_count
FROM sample_users s;
SQL

psql "${REHEARSAL_DB_URL_SECRET}" -c "
  SELECT COUNT(*) AS total_adjust_for_migrated
  FROM point_transactions pt
  JOIN users u ON pt.user_id = u.id
  WHERE pt.type = 'adjust' AND u.legacy_id IS NOT NULL;
"

psql "${REHEARSAL_DB_URL_SECRET}" -At -c "
  SELECT legacy_id || ':' || points
  FROM users
  WHERE legacy_id IN (SELECT legacy_id FROM (
    SELECT legacy_id FROM users WHERE legacy_id IS NOT NULL ORDER BY RANDOM() LIMIT 3
  ) s);
" | while read line; do
  LID=$(echo "$line" | cut -d: -f1)
  DB_POINTS=$(echo "$line" | cut -d: -f2)
  JSON_POINTS=$(jq -r --arg lid "$LID" '.[] | select(.legacyId == $lid) | .points' "$POINTS_JSON")
  echo "legacyId=$LID db=$DB_POINTS json=$JSON_POINTS match=$([ "$DB_POINTS" = "$JSON_POINTS" ] && echo YES || echo NO)"
done
```

### 判定
- `total_adjust_for_migrated = 0` かつ 全 match YES: **T2.2 PASSED**
- いずれか違反: **P0 issue** → STOP

### STOP 指示

```
Step 9 complete.
Sample 3: [legacy_id, db_points, migration_count=1, adjust_count=0 for each]
Global adjust for migrated: 0 (expected 0)
db_points vs JSON: YES/YES/YES

T2.2 bug fix verification: PASSED / FAILED

Reply: "done, proceed step 10"
```

---

## Step 10: 認証フロー + データ整合性 (ハイブリッド)

### 10-1. [Claude Code] テストユーザーのパスワード設定

```bash
source .env.rehearsal

TEST_USER=$(psql "${REHEARSAL_DB_URL_SECRET}" -At -c "
  SELECT id || ',' || email FROM users WHERE legacy_id IS NOT NULL ORDER BY RANDOM() LIMIT 1;
")
TEST_USER_ID=$(echo "$TEST_USER" | cut -d, -f1)
TEST_USER_EMAIL=$(echo "$TEST_USER" | cut -d, -f2)

ADMIN_TOKEN=$(grep "^ADMIN_TOKEN_SECRET=" .env.rehearsal | cut -d= -f2-)

curl -s -X PATCH "${PREVIEW_URL}/api/users/${TEST_USER_ID}" \
  -b "payload-token=${ADMIN_TOKEN}" \
  -H "Authorization: JWT ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"password": "Temp1234!"}' | jq '.doc.email // .errors // .message'

echo "TEST_USER_EMAIL=${TEST_USER_EMAIL}" >> .env.rehearsal
echo "Test user password set: ${TEST_USER_EMAIL}"
```

### 10-2. [Claude Code] ログイン確認

```bash
source .env.rehearsal

LOGIN_RESP=$(curl -s -X POST "${PREVIEW_URL}/api/users/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${TEST_USER_EMAIL}\", \"password\": \"Temp1234!\"}")

TEST_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')

if [ "$TEST_TOKEN" != "null" ] && [ -n "$TEST_TOKEN" ]; then
  echo "Login: OK"

  ME_RESP=$(curl -s "${PREVIEW_URL}/api/users/me" \
    -b "payload-token=${TEST_TOKEN}")

  REQUIRE_CHANGE=$(echo "$ME_RESP" | jq -r '.user.legacyData.requirePasswordChange // empty')
  echo "requirePasswordChange flag: ${REQUIRE_CHANGE}"

  ROOT_CHECK=$(curl -sI "${PREVIEW_URL}/" -b "payload-token=${TEST_TOKEN}" -w "%{http_code}\n" -o /dev/null)
  echo "Root access with token HTTP status: ${ROOT_CHECK}"
else
  echo "LOGIN FAILED: $(echo "$LOGIN_RESP" | jq -c '.errors // .message')"
fi
```

### 10-3. [Daisuke 手動、5 分] /account UI 目視確認

```
Daisuke, ONE quick browser check (~5 min):

1. Open incognito: ${PREVIEW_URL}/login
2. Login: email=${TEST_USER_EMAIL}, password=Temp1234!
3. Observe:
   - (a) Auto-redirect to /change-password → "auto-redirect: YES"
   - (b) No redirect but /change-password works → "auto-redirect: NO, manual works"
   - (c) Any error → "ERROR: <desc>"
4. Change password to NewPass5678! via /change-password
5. Go to /account, verify 10 fields visible/editable:
   nameKana, mobilePhone, gender, birthday, newsletterSubscribed,
   postalCode, prefecture, addressLine1, addressLine2, legacyRegisteredAt

Reply: "done, proceed step 10-4. auto-redirect: <a/b/c>. 10 fields: <OK/issues>"
```

### 10-4. [Claude Code] データ整合性最終確認

> **v3.2 修正**: `total_orders` / `total_spent` カラムは users テーブルに存在しないため削除。代わりに role + points の sample 確認に変更。

```bash
source .env.rehearsal

psql "${REHEARSAL_DB_URL_SECRET}" <<'SQL'
SELECT COUNT(*) AS admin_count FROM users WHERE role = 'admin';

SELECT legacy_id, role, points
FROM users WHERE legacy_id IS NOT NULL ORDER BY RANDOM() LIMIT 3;

SELECT
  COUNT(*) AS total_with_legacy,
  COUNT(DISTINCT legacy_id) AS unique_legacy,
  (COUNT(*) = COUNT(DISTINCT legacy_id)) AS is_unique
FROM users WHERE legacy_id IS NOT NULL;
SQL
```

### STOP 指示

```
Step 10 complete.
Auth flow: login OK, requirePasswordChange=<>, root HTTP=<>
UI check (Daisuke): auto-redirect=<a/b/c>, /account=<OK/issues>
Data integrity:
  - admin_count: N (>=1)
  - sample total_orders/total_spent: 0/0
  - legacyId uniqueness: is_unique=TRUE

Reply: "done, proceed step 11"
```

---

## Step 11: 結果ドキュメント生成 (Claude Code)

```bash
source .env.rehearsal

IMPORT_SUMMARY=$(jq '{total, created, updated, skipped, errors_count: (.errors | length // 0)}' tmp/rehearsal/import_response.json)
MIGRATE_SUMMARY=$(jq '{total, success, errors_count: (.errors | length // 0)}' tmp/rehearsal/migrate_points_response.json)
REPORT_FILE=$(ls -t tmp/rehearsal/conversion_report_*.json | head -1)
CONVERSION_SUMMARY=$(jq '{
  totalRows, successRows, skippedRows, errorRows,
  addressParseFailures: (.addressParseFailures | length),
  genderUnmapped: (.genderUnmapped | length),
  birthdayInvalid: (.birthdayInvalid | length),
  emailMissing: (.emailMissing | length),
  pointsMigrationCount, pointsMigrationTotal
}' "$REPORT_FILE")

cat > tmp/rehearsal/rehearsal-result.md <<EOF
# MakeShop ステージングリハーサル実施結果 — ${REHEARSAL_DATE}

## 実施情報
- 実施日: ${REHEARSAL_DATE}
- 実施者: Daisuke + Claude Code 自動実行
- Preview URL: ${PREVIEW_URL}
- Rehearsal Neon branch: rehearsal-${REHEARSAL_DATE} (${REHEARSAL_BRANCH_ID})
- 使用 CSV: ${REHEARSAL_CSV_PATH}

## 数値結果

### CSV 変換 (Step 4)
\`\`\`json
${CONVERSION_SUMMARY}
\`\`\`

### Import API (Step 5, 6)
\`\`\`json
${IMPORT_SUMMARY}
\`\`\`

### migrate-points API (Step 8)
\`\`\`json
${MIGRATE_SUMMARY}
\`\`\`

### T2.2 バグ修正検証 (Step 9)
- 検証結果: <PASSED/FAILED>

### 認証フロー (Step 10)
- ログイン: <OK/NG>
- change-password redirect: <a/b/c>
- /account 10 フィールド: <OK/issues>

## 問題リスト

| # | 発見 Step | カテゴリ | 内容 | 優先度 | 対応フェーズ | ステータス |
|---|---|---|---|---|---|---|
| 1 | build log | 観測 | pg-connection-string SSL mode 将来警告 | P2 | Phase H 以降 | 記録のみ |
| 2 | 事前準備 | 技術負債 | importMap.js untrack 戻し済、generate:importmap 自動化は後日 | P3 | 5月以降 | 記録のみ |

## 延期判断リミット照合

**ゲート 1 (4/28 24:00 JST) 判定**:
- P0 issue 件数: <auto-count>
- P1 issue 件数: <auto-count>
- 現時点判断: EXECUTE_4_30 / RE_EVALUATE / POSTPONE_TO_5_7

**Daisuke 追加所感**: _________
EOF

echo "Preview:"
cat tmp/rehearsal/rehearsal-result.md
```

### STOP 指示

```
Step 11 complete.
Generated: tmp/rehearsal/rehearsal-result.md (preview above)

Reply: "done, proceed step 12"
OR "hold, editing"
```

---

## Step 12: Commit + 後片付け (Claude Code + Daisuke 承認)

### 12-1. [Claude Code] 結果ドキュメント commit

```bash
source .env.rehearsal

git checkout main
git pull origin main

mkdir -p docs/migration
cp tmp/rehearsal/rehearsal-result.md "docs/migration/rehearsal-result-${REHEARSAL_DATE}.md"

git add "docs/migration/rehearsal-result-${REHEARSAL_DATE}.md"
git commit -m "docs: record MakeShop rehearsal results for ${REHEARSAL_DATE}"
git push origin main

echo "Results committed to main"
```

### 12-2. [Daisuke 承認 gate] cleanup 前確認

```
Step 12-1 complete. Results committed.

About to perform CLEANUP (destructive):
  1. Delete Neon branch: rehearsal-${REHEARSAL_DATE}
  2. Delete Vercel env vars scoped to rehearsal/${REHEARSAL_DATE}
  3. Delete Git branch: rehearsal/${REHEARSAL_DATE} (local + remote)

Reply: "done, cleanup approved"
OR "hold, keeping branches"
```

### 12-3. [Claude Code] Neon branch drop

```bash
source .env.rehearsal

curl -s -X DELETE \
  "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches/${REHEARSAL_BRANCH_ID}" \
  -H "Authorization: Bearer ${NEON_API_KEY}" | jq '.branch.id // .error'
```

### 12-4. [Claude Code] Vercel env vars delete

```bash
source .env.rehearsal

TEAM_QUERY=""
if [ -n "${VERCEL_TEAM_ID}" ]; then TEAM_QUERY="?teamId=${VERCEL_TEAM_ID}"; fi

ENV_VARS=$(curl -s \
  "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env${TEAM_QUERY}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}")

for ENV_ID in $(echo "$ENV_VARS" | jq -r ".envs[] | select(.gitBranch == \"rehearsal/${REHEARSAL_DATE}\") | .id"); do
  curl -s -X DELETE \
    "https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env/${ENV_ID}${TEAM_QUERY}" \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" > /dev/null
  echo "Deleted env var: ${ENV_ID}"
done
```

### 12-5. [Claude Code] Git branch delete

```bash
git push origin --delete "rehearsal/${REHEARSAL_DATE}" 2>/dev/null || true
git branch -D "rehearsal/${REHEARSAL_DATE}" 2>/dev/null || true
```

### 12-6. [Claude Code] 機密情報クリア

```bash
grep -v "^REHEARSAL_BRANCH_ID=\|^REHEARSAL_DB_URL_SECRET=\|^ADMIN_TOKEN_SECRET=\|^TEST_USER_EMAIL=\|^PREVIEW_URL=" .env.rehearsal > .env.rehearsal.tmp
mv .env.rehearsal.tmp .env.rehearsal
echo ".env.rehearsal cleaned (per-run secrets removed)"
```

### 12-7. [Daisuke 手動] Vercel Protection Bypass token revoke (v3.2 NEW)

リハーサル終了後は bypass secret を Vercel から削除する（残しておくと preview URL が任意の curl で抜けられる状態が継続）。

**手順**:
1. Vercel Dashboard → `u-balloon` → **Settings** → **Deployment Protection**
2. **「Protection Bypass for Automation」** セクション内の Note `rehearsal-${REHEARSAL_DATE}` の secret を **Delete**
3. ターミナルで `.env.rehearsal` の対応行も削除:
   ```bash
   sed -i '/^VERCEL_AUTOMATION_BYPASS_SECRET=/d' .env.rehearsal
   ```

### STOP 指示

```
Step 12 complete.
Cleanup: Neon branch DELETED, Vercel env vars <N> deleted, Git branch DELETED, .env.rehearsal cleaned
Manual TODO (Daisuke): Vercel bypass secret を Dashboard で revoke + .env.rehearsal から削除

Reply: "done, proceed step 13"
```

---

## Step 13: Self-archive (Claude Code)

```bash
source .env.rehearsal 2>/dev/null || true

mkdir -p docs/prompts/executed

PROMPT_SRC="${PROMPT_2_SOURCE_PATH:-./prompt-2-makeshop-rehearsal-2026-04-24.md}"

cp "${PROMPT_SRC}" "docs/prompts/executed/${REHEARSAL_DATE}-prompt2-makeshop-rehearsal.md"

git add "docs/prompts/executed/${REHEARSAL_DATE}-prompt2-makeshop-rehearsal.md"
git commit -m "chore: archive executed prompt-2 for MakeShop rehearsal ${REHEARSAL_DATE}"
git push origin main
```

### uraku-platform cross-repo handoff (optional)

```
Daisuke: create cross-repo handoff in uraku-platform/prompts/executed/?
Reply: "yes, cross-repo" or "no, skip"
```

yes の場合:

```bash
cd C:/dev/uraku-platform
git checkout main
git pull origin main
mkdir -p prompts/executed

cat > "prompts/executed/${REHEARSAL_DATE}-u-balloon-makeshop-rehearsal-handoff.md" <<EOF
# U BALLOON MakeShop リハーサル実施 handoff — ${REHEARSAL_DATE}

u-balloon repo で実施したリハーサルの結果サマリー (cross-repo 参照用)。

- 実施日: ${REHEARSAL_DATE}
- 結果: <PASSED/FAILED>
- 詳細: u-balloon/docs/migration/rehearsal-result-${REHEARSAL_DATE}.md を参照
- 4/30 本番切替判定: <実施 / 延期>
EOF

git add "prompts/executed/${REHEARSAL_DATE}-u-balloon-makeshop-rehearsal-handoff.md"
git commit -m "chore: archive u-balloon makeshop rehearsal handoff for ${REHEARSAL_DATE}"
git push origin main
```

### 最終報告

```
Step 13 complete. All prompt operations finished.

===== Final Summary =====
Rehearsal date: ${REHEARSAL_DATE}
T2.2 bug fix: PASSED/FAILED
P0 issues: N, P1: N, P2: N
Gate 1 decision (for 4/28 24:00 JST): EXECUTE_4_30 / RE_EVALUATE / POSTPONE_TO_5_7
Next milestone: 4/28 24:00 JST — Gate 1 re-evaluation + Phase H prompt drafting
=========================

🎈 Rehearsal prompt complete.
```

---

## 付録 A: トラブルシュート

### A-1. Neon API で `parent_id` が無効
- `NEON_PRODUCTION_BRANCH_ID` を Neon Console で再確認(`br-icy-bar-a1bwijql` 形式)

### A-2. Vercel Preview build 失敗
- rehearsal branch が main から派生しているか確認 → `git merge main` してから push
- importMap.js が tracked で push されているかも確認

### A-3. Admin login が 401
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` が production と不一致
- rehearsal branch は production コピーなので同じ credentials で通るはず

### A-4. Import API が 401/403
- Step 0-3 で確認した auth 方式と curl の送信方式が不整合
- route.ts を再確認: `req.user` 参照なら cookie が効く

### A-5. Import API が 500
- Vercel Function Logs を確認
- よくある原因: CSV 文字コード (UTF-8 BOM)、row 中の改行エスケープ不整合

### A-6. `psql` が SSL connection で止まる
- connection string に `?sslmode=require` あり
- Windows psql が SSL root 未保持なら `sslmode=no-verify` に一時変更

### A-7. `adjust_count != 0` (Step 9 FAILED)
- `src/hooks/pointAdjustHook.ts:20` の条件分岐確認
- `src/app/(frontend)/api/admin/migrate-points/route.ts:61` の context 確認
- `git show f9b8631 -- src/` で差分再確認

---

## 付録 B: 既知の非 blocker 事項

- pg-connection-string SSL mode warning (P2)
- importMap.js は tracked、`payload generate:importmap` 自動化は後日(P3)
- Prettier による markdown 微細差分 (非 blocker)
- `vercel-dev` Neon branch archived 状態 (4/30 切替後の運用整理)

---

## 付録 C: Daisuke 手動タスク一覧 (最小)

1. **事前準備** (Section 0.0.1-0.0.6)
2. **Step 境界応答**: 各 Step 末尾で `done, proceed step N`
3. **Step 5-3 fallback**: import API 自動失敗時 UI 手動アップロード
4. **Step 10-3**: /account UI 目視(約 5 分)
5. **Step 11**: 結果ドキュメントレビュー
6. **Step 12-2**: cleanup 承認
7. **Step 13 cross-repo handoff**: yes/no

---

## 付録 D: 確定事実の一覧

- **Import endpoint**: `POST /api/admin/import/customers`
- **migrate-points endpoint**: `POST /api/admin/migrate-points`
- **skipWelcomeEmail**: `src/hooks/userHooks.ts:11`
- **skipPointAdjustHook**: `src/hooks/pointAdjustHook.ts:20`
- **T2.2 修正**: `src/app/(frontend)/api/admin/migrate-points/route.ts:61` (commit `f9b8631`)
- **Neon DB**: `neondb` / `neondb_owner`、pooler endpoint
- **build script**: `node scripts/patch-payload-paginator.mjs && next build` (importMap.js は tracked のまま)
- **convert script path**: `scripts/convert-makeshop-csv.ts` (NOT `src/scripts/...`)
- **認証**: cookie + Authorization header 両方送信(curl)

---

**プロンプト 2 v3.1 — 以上**
