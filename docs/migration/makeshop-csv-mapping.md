# MakeShop CSV → u-balloon インポート形式 マッピング仕様

## 概要

本ドキュメントは MakeShop からエクスポートされる会員データ CSV（タブ区切り TSV 形式）を
u-balloon の `/api/admin/import/customers` および `/api/admin/migrate-points` が受け付ける形式に
変換する際のフィールドマッピング・変換ルールを定義します。

変換スクリプト: `scripts/convert-makeshop-csv.ts`

---

## MakeShop CSV のヘッダー一覧（タブ区切り TSV）

```
登録日	ショップID	会員グループ	会員ID	お名前	フリガナ	E-mail	メールマガジン	性別	生年月日	ポイント	ショップポイント有効期限	電話番号	会社電話番号	携帯電話番号	郵便番号	自宅住所	会社郵便番号	会社住所	携帯電話E-mail	FAX	その他
```

合計 22 カラム。区切り文字はタブ（`\t`）。文字コードは UTF-8（BOM 付き・なし両方対応）。

---

## フィールドマッピング表

| MakeShop カラム | u-balloon フィールド | 変換ロジック |
|---|---|---|
| 登録日 | `legacyRegisteredAt` | `YYYY/MM/DD` → ISO 8601 `YYYY-MM-DD`。空欄→空文字 |
| ショップID | `legacyData.shopId` | そのまま |
| 会員グループ | `legacyData.memberGroup` | そのまま（空欄可） |
| 会員ID | `MakeShop移行ID`（legacyId） | そのまま。空欄なら行をスキップ（必須） |
| お名前 | `氏名`（name） | trim |
| フリガナ | `フリガナ`（nameKana） | trim |
| E-mail | `メールアドレス`（email） | 小文字正規化・前後空白 trim・全角→半角変換。空欄 or `@` なしなら行をスキップ |
| メールマガジン | `メルマガ購読`（newsletterSubscribed） | `Y`→`TRUE`, `N` or 空→`FALSE` |
| 性別 | `性別`（gender） | 後述の値変換ルール参照 |
| 生年月日 | `生年月日`（birthday） | 後述の日付変換ルール参照 |
| ポイント | **points_migration.json に分離** | customers CSV には含めない |
| ショップポイント有効期限 | `legacyData.pointsExpireAt` | そのまま |
| 電話番号 | `電話番号`（phone） | 全角→半角変換。ハイフンは元のまま維持 |
| 会社電話番号 | `legacyData.companyPhone` | そのまま |
| 携帯電話番号 | `携帯電話番号`（mobilePhone） | 全角→半角変換。ハイフンは元のまま維持 |
| 郵便番号 | `郵便番号`（postalCode） | 全角→半角変換。7桁数字ならハイフン挿入（例: `8800861`→`880-0861`） |
| 自宅住所 | `都道府県` + `住所1` + `デフォルト配送先住所` | 後述の住所分離ロジック参照 |
| 会社郵便番号 | `legacyData.companyPostalCode` | そのまま |
| 会社住所 | `legacyData.companyAddress` | そのまま |
| 携帯電話E-mail | `legacyData.mobileEmail` | そのまま |
| FAX | `legacyData.fax` | そのまま |
| その他 | `legacyData.other` | そのまま |

---

## 出力 CSV ヘッダー（`customers_import_YYYY-MM-DD.csv`）

```
メールアドレス,氏名,フリガナ,電話番号,携帯電話番号,性別,生年月日,メルマガ購読,郵便番号,都道府県,住所1,住所2,デフォルト配送先住所,旧登録日時,MakeShop移行ID,legacyData
```

- UTF-8 BOM 付きで出力（Excel で文字化けしない）
- `points` カラムは含めない（分離投入方針）
- 全フィールドは RFC 4180 準拠の二重引用符でエスケープ

---

## 値変換ルール

### 性別（gender）

| MakeShop 値 | u-balloon 値（CSV） | 備考 |
|---|---|---|
| `男` | `男性` | male に対応 |
| `女` | `女性` | female に対応 |
| 空欄 | `未設定` | unspecified に対応 |
| その他 | `未設定` | genderUnmapped としてレポートに記録 |

### メールマガジン（newsletterSubscribed）

| MakeShop 値 | u-balloon 値 |
|---|---|
| `Y` | `TRUE` |
| `N` | `FALSE` |
| 空欄 | `FALSE` |

### 日付フォーマット

- MakeShop: `YYYY/MM/DD`
- u-balloon: `YYYY-MM-DD`（ISO 8601 date）
- 空欄 / `//`: 空文字（null）
- パース失敗: 空文字 + `birthdayInvalid` としてレポートに記録

---

## 住所分離ロジック

MakeShop の「自宅住所」は都道府県・市区町村・番地が一続きの文字列になっています。
u-balloon では `prefecture`（都道府県）と `addressLine1`（市区町村・番地）に分離します。

### 正規表現

```
/^(東京都|北海道|(?:京都|大阪)府|(?:青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)県)\s*/
```

### 挙動

**マッチ成功例**:
```
入力: "宮崎県 宮崎市出来島町 181番地1"
→ 都道府県:    "宮崎県"
→ 住所1:       "宮崎市出来島町 181番地1"
→ 住所2:       ""（空）
→ デフォルト配送先住所: "宮崎県 宮崎市出来島町 181番地1"（原文）
```

**マッチ失敗例**（都道府県が前置されていない等）:
```
入力: "出来島町 181番地1"
→ 都道府県:    ""（空）
→ 住所1:       ""（空）
→ デフォルト配送先住所: "出来島町 181番地1"（原文そのまま）
→ legacyData.addressParseStatus: "failed"
→ legacyData.rawAddress: "出来島町 181番地1"
→ addressParseFailures にカウント（レポートに記録）
```

`addressLine2` はつねに空文字（MakeShop に該当データなし）。

---

## legacyData JSON の構造

```json
{
  "source": "makeshop",
  "importedAt": "2026-04-12T10:00:00.000Z",
  "requirePasswordChange": true,
  "shopId": "uballoon",
  "memberId": "MS001",
  "registeredAt": "2025/10/11",
  "companyPhone": "",
  "companyPostalCode": "",
  "companyAddress": "",
  "mobileEmail": "",
  "fax": "",
  "pointsExpireAt": "",
  "memberGroup": "",
  "other": "",
  "rawAddress": "宮崎県 宮崎市出来島町 181番地1",
  "addressParseStatus": "ok"
}
```

- `source: "makeshop"` 固定
- `importedAt`: スクリプト実行時刻（ISO 8601 UTC）
- `requirePasswordChange: true` 固定（Phase D: change-password リダイレクトで使用）
- 空文字のフィールドも JSON に含めて保持（後の照合・デバッグ用）
- `rawAddress` は自宅住所が空欄の場合は省略される
- `addressParseStatus`: `"ok"` or `"failed"`

---

## ポイントの分離投入方針

MakeShop のポイントデータは customers CSV には含めず、別ファイル `points_migration_YYYY-MM-DD.json` に分離します。

**理由**:
- u-balloon ではポイントに `PointTransaction`（取引ログ）が紐付くため、インポート時に一括設定ではなく専用エンドポイント `/api/admin/migrate-points` 経由で移行する
- ポイント 0 のレコードは移行不要のため除外

**`points_migration_YYYY-MM-DD.json` のフォーマット**:

```json
[
  { "legacyId": "MS001", "points": 1500 },
  { "legacyId": "MS002", "points": 3200 }
]
```

ポイントが 0 のレコードは含まれません。

---

## スクリプト実行方法

### 前提

- Node.js + TypeScript 環境（u-balloon プロジェクトの `npx tsx` が使えること）
- 入力 CSV は **UTF-8**（BOM 付き・なし両方対応）
- Shift_JIS の場合は事前に変換:
  ```sh
  iconv -f SJIS -t UTF-8 makeshop_export.csv > makeshop_export_utf8.csv
  ```

### 基本実行

```sh
# ドライラン（レポートのみ確認、CSV/JSON は出力しない）
npx tsx scripts/convert-makeshop-csv.ts scripts/sample-makeshop-export.csv --dry-run

# 実際の変換（./output/ に出力）
npx tsx scripts/convert-makeshop-csv.ts scripts/sample-makeshop-export.csv

# 出力先を指定
npx tsx scripts/convert-makeshop-csv.ts makeshop_export.csv --out-dir ./tmp/migration-2026-04/
```

### 出力ファイル

| ファイル名 | 説明 |
|---|---|
| `customers_import_YYYY-MM-DD.csv` | `/api/admin/import/customers` に投入する会員データ CSV |
| `points_migration_YYYY-MM-DD.json` | `/api/admin/migrate-points` に投入するポイントデータ JSON |
| `conversion_report_YYYY-MM-DD.json` | 変換サマリ・エラー詳細レポート |

---

## conversion_report フォーマット

```json
{
  "inputFile": "/absolute/path/to/input.csv",
  "totalRows": 1000,
  "successRows": 950,
  "skippedRows": 30,
  "errorRows": 20,
  "addressParseFailures": [
    { "legacyId": "MS042", "rawAddress": "出来島町 181番地1" }
  ],
  "genderUnmapped": [
    { "legacyId": "MS099", "rawValue": "不明" }
  ],
  "birthdayInvalid": [
    { "legacyId": "MS123", "rawValue": "不明" }
  ],
  "emailMissing": [
    { "legacyId": "MS007" }
  ],
  "pointsMigrationCount": 450,
  "pointsMigrationTotal": 125000
}
```

- `skippedRows`: 会員IDが空、またはメールアドレスが無効で処理をスキップした行数
- `errorRows`: 現バージョンでは常に 0（1行のパース失敗が全体を止めない設計。エラーは各配列に記録）
- `addressParseFailures`: 都道府県の抽出に失敗した行（デフォルト配送先住所には原文が入る）
- `genderUnmapped`: 性別の値が「男」「女」以外だった行（`unspecified` として扱われる）
- `birthdayInvalid`: 生年月日のパースに失敗した行（空文字になる）
- `emailMissing`: E-mail が空欄または不正形式の行（スキップされる）
