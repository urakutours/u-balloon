# MakeShop 会員データ移行 — ステージングリハーサル手順書

> 本ドキュメントは Phase B / C / D の成果を end-to-end で検証するための
> 手順書です。実施はこのチェックリストの順に1つずつ確認しながら進めてください。
>
> 関連ドキュメント:
> - `phase-b-users-schema.md` — Users スキーマ拡張の仕様
> - `makeshop-csv-mapping.md` — MakeShop CSV → u-balloon マッピング表
>
> スコープ外:
> - forgot-password / reset-password (Phase E)
> - リニューアル案内メール送信 (Phase F)
> - 本番切替 (Phase H)

---

## 前提条件

- Phase B (Users スキーマ拡張) 実装完了
- Phase C (convert-makeshop-csv.ts) 実装完了
- Phase D (import/customers API 拡張 + migrate-points バグ修正) 実装完了

---

## 0. 事前準備

### 0-1. Neon ステージング DB のバックアップ

- [ ] Neon ダッシュボード（https://console.neon.tech）を開く
- [ ] 対象プロジェクトの「Branches」タブから「Create Branch」を押し、ブランチ名を `rehearsal-YYYY-MM-DD` として作成する（例: `rehearsal-2026-04-12`）
  - これがロールバック時の復元ポイントになる。問題発生時は Step 7 参照

### 0-2. ステージング DB のテストデータ削除

- [ ] ステージング DB に psql または Neon SQL エディタで接続し、以下を実行する:
  ```sql
  DELETE FROM point_transactions;
  DELETE FROM users WHERE role != 'admin';
  ```
  - T2.2 バグ修正前に作られた重複 adjust レコードを含む既存テストデータを一括削除する
  - admin アカウント（`role = 'admin'`）は残る

### 0-3. MakeShop raw CSV の入手

- [ ] 本番切替直前のスナップショットに近い最新版の MakeShop 会員エクスポート CSV（TSV 形式）を入手する

### 0-4. ステージング環境の `.env` 確認

- [ ] `DATABASE_URL` がステージング Neon を指していること（本番 DB を誤って参照していないか確認）
- [ ] `NEXT_PUBLIC_SERVER_URL` が `https://u-balloon.vercel.app` であること
- [ ] Resend API キーがステージング用に設定されていること（本番キーのままだと実ユーザーに誤送信する危険がある）

### 0-5. ステージングビルドの確認

- [ ] Vercel ダッシュボードで `u-balloon.vercel.app` の最新デプロイが成功していること（Status: Ready）

---

## 1. CSV 変換（Phase C の検証）

### 1-1. 変換スクリプトの実行

- [ ] ローカルで以下のコマンドを実行する:
  ```bash
  cd C:/dev/uballoon/u-balloon
  npx tsx scripts/convert-makeshop-csv.ts path/to/makeshop-export.tsv --out-dir ./tmp/rehearsal
  ```

### 1-2. 出力ファイル3点の生成確認

- [ ] `tmp/rehearsal/customers_import_YYYY-MM-DD.csv` が生成されていること
- [ ] `tmp/rehearsal/points_migration_YYYY-MM-DD.json` が生成されていること
- [ ] `tmp/rehearsal/conversion_report_YYYY-MM-DD.json` が生成されていること

### 1-3. conversion_report の記録

`conversion_report_YYYY-MM-DD.json` を開き、以下の数値を記録する:

| 項目 | 値 |
|---|---|
| totalRows | |
| successRows | |
| skippedRows | |
| errorRows | |
| addressParseFailures 件数 | |
| genderUnmapped 件数 | |
| birthdayInvalid 件数 | |
| emailMissing 件数 | |
| pointsMigrationCount | |
| pointsMigrationTotal | |

- [ ] 上記の数値を記録した

### 1-4. customers_import CSV の目視確認

`customers_import_YYYY-MM-DD.csv` の1〜3行目を開いて目視確認する:

- [ ] ヘッダーが16列であること（`メールアドレス,氏名,フリガナ,電話番号,携帯電話番号,性別,生年月日,メルマガ購読,郵便番号,都道府県,住所1,住所2,デフォルト配送先住所,旧登録日時,MakeShop移行ID,legacyData`）
- [ ] `points` 列が含まれていないこと（ポイントは別ファイルに分離されている）
- [ ] `legacyData` 列が JSON 文字列として格納されていること

### 1-5. エラー対応

- [ ] `skippedRows` や `errorRows` が想定を大幅に超えていない場合は次の Step へ進む
- [ ] エラーが多い場合は `emailMissing` / `addressParseFailures` の各配列を確認し、raw CSV を見直してから再実行する

---

## 2. 会員データインポート（Phase B + D の検証）

### 2-1. 管理画面へのログイン

- [ ] ステージング管理画面 `https://u-balloon.vercel.app/admin` に admin アカウントでログインする

### 2-2. CSV アップロード

- [ ] 管理画面の CSV インポート UI（ImportExportPage）を開く
- [ ] `customers_import_YYYY-MM-DD.csv` を選択してアップロードする

### 2-3. インポート結果の記録

レスポンスの summary を記録する:

| 項目 | 値 |
|---|---|
| total | |
| created | |
| updated | |
| skipped | |
| errors (件数) | |

- [ ] 上記の数値を記録した
- [ ] `errors` 配列に予期しないエラーがないこと（admin アカウントの変更拒否などは正常動作）

### 2-4. 一覧表示でのインポート件数確認

- [ ] `/admin/collections/users` で一覧表示し、インポート件数（created + updated）が conversion_report の successRows と整合していること

### 2-5. 個別ユーザーの目視確認

ランダムに5件のユーザーを開き、以下のフィールドが全て正しく入っているか確認する:

- [ ] `name`, `nameKana`, `phone`, `mobilePhone`
- [ ] `gender`, `birthday`, `newsletterSubscribed`
- [ ] `postalCode`, `prefecture`, `addressLine1`, `addressLine2`, `defaultAddress`
- [ ] `legacyId`, `legacyRegisteredAt`
- [ ] `legacyData.source === 'makeshop'`
- [ ] `legacyData.requirePasswordChange === true`
- [ ] `points === 0`（ポイント移行はまだ行っていないため 0 であること）

### 2-6. ウェルカムメール未送信の確認（skipWelcomeEmail 動作確認）

- [ ] Resend ダッシュボード（https://resend.com/emails）を開き、インポート処理中にメールが送信されていないことを確認する
- [ ] ウェルカムメールが **1通も送信されていない** ことを確認する（`skipWelcomeEmail: true` が正常に機能していることの証明）
- [ ] **もし1通でも送信されていた場合はインポートを中止し、`src/hooks/userHooks.ts` の skipWelcomeEmail 条件分岐を確認して原因調査する**

---

## 3. ポイント移行（Phase D の T2.2 バグ修正検証）

### 3-1. points_migration JSON の確認

- [ ] `points_migration_YYYY-MM-DD.json` を開き、配列形式で各要素に `legacyId` と `points` が含まれていることを確認する:
  ```json
  [
    { "legacyId": "MS001", "points": 1500 },
    { "legacyId": "MS002", "points": 3200 }
  ]
  ```

### 3-2. migrate-points API への投入

- [ ] ブラウザの開発者ツール（DevTools → Application → Cookies）で `payload-token` の値を取得する
- [ ] 以下の curl コマンドを実行する（`<admin_token>` を取得した token に置き換える）:
  ```bash
  curl -X POST https://u-balloon.vercel.app/api/admin/migrate-points \
    -H "Content-Type: application/json" \
    -H "Authorization: JWT <admin_token>" \
    -d @tmp/rehearsal/points_migration_YYYY-MM-DD.json
  ```

### 3-3. migrate-points レスポンスの記録

レスポンスの `summary` を記録する:

| 項目 | 値 |
|---|---|
| total | |
| success | |
| errors | |

- [ ] 上記の数値を記録した
- [ ] `errors` 件数が 0 であること（または原因を特定して「問題リスト」に記録）

### 3-4. サンプル3名のデータ確認（T2.2 バグ修正の核心検証）

migration 対象からランダムに3名選び、以下を確認する:

- [ ] `users.points` が `points_migration_YYYY-MM-DD.json` の `points` 値と一致していること
- [ ] `/admin/collections/point-transactions` で該当ユーザーを絞り込み、`type: 'migration'` のレコードが **1件だけ** 存在すること
- [ ] 同じユーザーに `type: 'adjust'` のレコードが **存在しない** こと
  - これが T2.2 バグ修正（`context: { skipPointAdjustHook: true }` 追加）の核心検証項目
  - adjust レコードが存在する場合、`skipPointAdjustHook` が正しく機能していないため原因調査が必要

### 3-5. adjust レコードのゼロ件確認（全件）

- [ ] `/admin/collections/point-transactions` でフィルタ `type = adjust` を実行し、**対象ユーザー（legacyId が設定されているユーザー）** に adjust レコードがゼロ件であることを確認する

---

## 4. 動作確認（認証 + change-password フロー）

### 4-1. テストユーザーの準備

- [ ] 移行したユーザーの中からメールアドレスを1つ選ぶ
- [ ] `/admin/collections/users` でそのユーザーを開き、admin 権限でパスワードを一時的なパスワード（例: `Temp1234!`）に手動設定して保存する

### 4-2. ログインテスト

- [ ] ブラウザのシークレットウィンドウ（または別ブラウザ）でログインページ `/login` を開く
- [ ] 選んだメールアドレス + 一時パスワードでログインする

### 4-3. change-password リダイレクト確認

- [ ] ログイン後に `/change-password` へ自動リダイレクトされることを確認する
  - **Note**: change-password へのリダイレクトロジックは Phase D 設計で予定されていたが、T2.3 の実装スコープには含まれていなかった可能性がある。自動リダイレクトがされない場合は手動で `/change-password` に遷移し、フォームが表示・動作するかのみ確認する。未実装の場合は本手順書末尾の「問題リスト」に記録する
- [ ] `/change-password` フォームから新しいパスワードに変更できること

### 4-4. 変更後の動作確認

- [ ] 変更後、新パスワードで再ログインできること
- [ ] `/account` ページで、10個の新フィールド（nameKana, mobilePhone, gender, birthday, newsletterSubscribed, postalCode, prefecture, addressLine1, addressLine2, legacyRegisteredAt）が表示・編集可能か目視確認する

---

## 5. データ整合性の最終確認

### 5-1. admin アカウントの保全確認

- [ ] Step 0-2 で truncate した後も既存の admin アカウントが消えていないこと（`/admin/collections/users` で role=admin のユーザーが存在すること）

### 5-2. 移行会員の注文データ確認

- [ ] インポートした移行会員の `totalOrders` と `totalSpent` が `0` で表示されること（まだ注文がないため）

### 5-3. legacyId のユニーク性確認

- [ ] インポートした全会員の `legacyId` が重複なくユニークであること
- [ ] Neon SQL エディタで以下の SQL を実行し、2つの COUNT が一致することを確認する:
  ```sql
  SELECT COUNT(*) FROM users WHERE legacy_id IS NOT NULL;
  SELECT COUNT(DISTINCT legacy_id) FROM users WHERE legacy_id IS NOT NULL;
  -- 両者が一致すれば legacyId の重複なし
  ```
- [ ] 両者の件数が一致していること

---

## 6. 結果記録と問題リスト

### 6-1. リハーサル実施記録

本チェックリストをコミットし、以下を記載する:

```
- 実施日: 2026-04-XX
- 実施者: <名前>
- ステージング URL: https://u-balloon.vercel.app
- 使用 CSV: <ファイル名>
- 変換結果: total=N, success=N, errors=N
- インポート結果: created=N, updated=N, skipped=N
- ポイント移行結果: success=N, errors=N
```

### 6-2. 次フェーズへの申し送り

- [ ] Phase E（forgot-password / reset-password）/ Phase F（リニューアル案内メール送信）/ Phase H（本番切替）に着手する前に、必ず以下の「問題リスト」を参照し、未解決の問題がないことを確認する

---

### 問題リスト

リハーサル中に発見された問題をここに記録する。

| # | 発見日 | カテゴリ | 内容 | 対応フェーズ | ステータス |
|---|---|---|---|---|---|
| 1 |  |  |  |  |  |

---

## 7. ロールバック手順

問題が発生した場合、以下いずれかの方法でリセットする。

### 7-1. Neon ブランチ切り戻し（推奨）

事前に Step 0-1 で作成した `rehearsal-YYYY-MM-DD` ブランチを使って復元する:

- [ ] Neon ダッシュボードの「Branches」で `rehearsal-YYYY-MM-DD` ブランチを選択する
- [ ] 「Promote to primary」または `DATABASE_URL` を `rehearsal-YYYY-MM-DD` ブランチの接続文字列に切り替える
- [ ] Vercel のステージング環境変数 `DATABASE_URL` を更新して再デプロイする

### 7-2. テーブル truncate（手動、Neon ブランチが使えない場合）

```sql
-- 移行データのみ削除（admin は残す）
DELETE FROM point_transactions WHERE user_id IN (
  SELECT id FROM users WHERE role != 'admin' AND legacy_id IS NOT NULL
);
DELETE FROM users WHERE role != 'admin' AND legacy_id IS NOT NULL;
```

- [ ] 上記 SQL を実行し、admin アカウントが残っていることを確認して再試行する
