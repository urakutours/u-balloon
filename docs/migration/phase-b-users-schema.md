# Phase B: Users コレクション スキーマ拡張

## 目的

MakeShop からの会員データ移行に必要なフィールドを Users コレクションに追加する。
**既存フィールドの `name` は一切変更しない**（DB カラム名に直結するため）。
**既存機能に影響を与えない**（defaultAddress は残置、チェックアウト・アカウントページは変更しない）。

---

## 前提

- プロジェクト: U BALLOON（Next.js 16 + Payload CMS v3 + Neon PostgreSQL）
- 対象ファイル: `src/collections/Users.ts`
- Phase A 調査により、以下が確認済み:
  - `auth: true`(単純形)
  - 既存フィールド: `role`, `name`, `phone`, `defaultAddress`, `points`, `legacyId`, `legacyData`, `totalOrders`(virtual), `totalSpent`(virtual)
  - `defaultAddress` はチェックアウト・アカウントページ・インポート/エクスポートが依存 → 残置
  - `legacyData` は json 型。`requirePasswordChange` フラグ用に既に使用されている
  - Hook: `beforeChange: [beforeUserPointsChange]`, `afterChange: [afterUserCreate]`

---

## Step 0: 作業開始前の確認（stop-and-report ゲート）

以下を実行し、結果を報告してから Step 1 に進むこと。

### 0-1. 現在の Users.ts の確認

Read tool で src/collections/Users.ts を読み、以下を確認して報告:
- フィールド数と name の一覧
- `legacyId` に `unique: true` と `index: true` が設定されていること
- Hook の設定(beforeChange, afterChange)

### 0-2. DB マイグレーションの状態確認

```bash
ls src/migrations/ 2>/dev/null | tail -20
```

Payload v3 のマイグレーション方式（`payload migrate:create` / `payload migrate`）が使えるか package.json のスクリプトを確認する。

### 0-3. 既存データの確認

ローカル DB に接続できない場合は「ローカル DB に接続できない、ステージングデプロイ時に自動マイグレーション」と報告する。

---

## Step 1: フィールド追加

`src/collections/Users.ts` の `fields` 配列に以下のフィールドを追加する。

### 追加位置のルール

- 既存フィールドの順序は変更しない
- 新フィールドは `phone` フィールドの後、`defaultAddress` フィールドの前に挿入する
- ただし `legacyRegisteredAt` は `legacyId` の後に配置する

### 追加するフィールド一覧

**フィールド `name` のスペルミスは DB カラム名の不整合を起こすため、特に注意すること**:

- `nameKana` (text) — フリガナ、admin.description: 'カタカナ表記'
- `mobilePhone` (text) — 携帯電話番号
- `gender` (select) — 性別、options: [{男性:male}, {女性:female}, {未設定:unspecified}]、defaultValue: 'unspecified'
- `birthday` (date) — 生年月日、admin.date.displayFormat: 'yyyy/MM/dd', pickerAppearance: 'dayOnly'
- `newsletterSubscribed` (checkbox) — メルマガ購読、defaultValue: false
- `postalCode` (text) — 郵便番号、admin.description: '例: 880-0861'
- `prefecture` (select) — 都道府県、options は47都道府県（後述）
- `addressLine1` (text) — 住所(市区町村・番地)、admin.description: '例: 宮崎市出来島町 181番地1'
- `addressLine2` (text) — 住所(建物名・部屋番号)
- `legacyRegisteredAt` (date) — MakeShop登録日、admin.description: 'MakeShopでの元の登録日'、position: 'sidebar'、condition: (data) => data?.legacyRegisteredAt != null

### prefecture の options

47都道府県を label=日本語, value=日本語で列挙:
北海道/青森県/岩手県/宮城県/秋田県/山形県/福島県/茨城県/栃木県/群馬県/埼玉県/千葉県/東京都/神奈川県/新潟県/富山県/石川県/福井県/山梨県/長野県/岐阜県/静岡県/愛知県/三重県/滋賀県/京都府/大阪府/兵庫県/奈良県/和歌山県/鳥取県/島根県/岡山県/広島県/山口県/徳島県/香川県/愛媛県/高知県/福岡県/佐賀県/長崎県/熊本県/大分県/宮崎県/鹿児島県/沖縄県

### 追加後のフィールド順序（確認用）

1. role(既存)
2. name(既存)
3. phone(既存)
4. nameKana(新規)
5. mobilePhone(新規)
6. gender(新規)
7. birthday(新規)
8. newsletterSubscribed(新規)
9. postalCode(新規)
10. prefecture(新規)
11. addressLine1(新規)
12. addressLine2(新規)
13. defaultAddress(既存、残置)
14. points(既存)
15. legacyId(既存)
16. legacyRegisteredAt(新規)
17. legacyData(既存)
18. totalOrders(既存 virtual)
19. totalSpent(既存 virtual)

### admin の更新

```typescript
admin: {
  useAsTitle: 'email',
  group: '顧客',
  description: '会員・管理者アカウントの一覧。ポイント残高の確認・手動調整もここから行えます。',
  defaultColumns: ['email', 'name', 'nameKana', 'role', 'points', 'phone', 'prefecture', 'createdAt'],
  listSearchableFields: ['email', 'name', 'nameKana', 'phone', 'legacyId'],
},
```

変更点:
- defaultColumns に `nameKana` と `prefecture` を追加
- listSearchableFields に `nameKana` と `legacyId` を追加

---

## Step 2: collapsible でグルーピング

**重要**: フィールド `name` は一切変えない。collapsible はフィールドの DB 構造には影響しない(表示のみ)。

### グループ構成

- **グループ1（collapsible なし、常時表示）**: `role`, `name`, `nameKana`, `phone`, `mobilePhone`
- **グループ2「個人情報」（collapsible, initCollapsed: true）**: `gender`, `birthday`, `newsletterSubscribed`
- **グループ3「住所情報」（collapsible, initCollapsed: false）**: `postalCode`, `prefecture`, `addressLine1`, `addressLine2`, `defaultAddress`
- **グループ4（collapsible なし）**: `points`（既存位置を維持）
- **グループ5（collapsible に入れず sidebar のまま）**: `legacyId`, `legacyRegisteredAt`, `legacyData`

collapsible 内に移動してもフィールド `name` は変えない。`access` 設定があるものはそのまま維持する。

---

## Step 3: TypeScript 型チェックとビルド確認

```bash
npx tsc --noEmit 2>&1 | head -50
```

エラーがあれば修正案を提示（自動で適用）。

```bash
npx payload generate:types 2>&1 | tail -20
```

型定義再生成。エラーがあれば報告。

```bash
npm run build 2>&1 | tail -30
```

ビルドが通ることを確認。

---

## Step 4: DB マイグレーション

### 4-1. マイグレーションファイルの生成

```bash
npx payload migrate:create add-user-profile-fields 2>&1
```

生成されたマイグレーションファイルを確認:

```bash
ls -la src/migrations/ | tail -5
```

### 4-2. マイグレーション内容の確認

生成されたファイルに以下のカラム（snake_case）が含まれていることを確認:
- name_kana, mobile_phone, gender, birthday, newsletter_subscribed
- postal_code, prefecture, address_line1, address_line2, legacy_registered_at

**注意**: Payload v3 の命名変換は自動、実際の命名は生成結果に従う。

### 4-3. マイグレーションの実行

ローカル DB 接続が可能なら `npx payload migrate` を実行する。
接続できない場合はファイル生成のみで完了、ステージングデプロイ時に自動実行される旨を報告する。

---

## Step 5: 動作確認（手動テスト — 今回はスキップ）

ブラウザでの手動テストが必要なためこの Step はユーザー側で実施。
あなたは Step 4 完了時点でビルド成功を確認できていれば OK。

---

## Step 6: 完了報告

以下の形式で最終報告を作成:

```
## Phase B 完了報告

### 追加したフィールド（10個）
- nameKana, mobilePhone, gender, birthday, newsletterSubscribed
- postalCode, prefecture, addressLine1, addressLine2, legacyRegisteredAt

### admin UI の変更
- defaultColumns: (変更内容)
- listSearchableFields: (変更内容)
- collapsible グループ: (追加したグループ名)

### DB マイグレーション
- マイグレーションファイル: (ファイル名)
- 実行状態: 完了 / ステージングデプロイ待ち

### TypeScript / ビルド
- tsc --noEmit: エラー 0件
- generate:types: 成功
- npm run build: 成功

### Phase C への申し送り
- (あれば)
```

---

## 重要な注意事項

1. 既存フィールドの `name` は絶対に変更しない
2. 既存フィールドの順序変更は最小限に(collapsible 内での移動のみ)
3. `defaultAddress` は残置
4. 全ての新フィールドは任意(`required: true` にしない)
5. `gender` の `defaultValue: 'unspecified'`
6. `newsletterSubscribed` の `defaultValue: false`

## 完了条件

- 10個の新フィールドが Users コレクションに追加されている
- TypeScript エラー 0件
- ビルド成功
- DB マイグレーションファイル生成完了(または実行完了)
- 既存機能(登録・ログイン・アカウント・チェックアウト)に影響なし（コード差分から判断）
