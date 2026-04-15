# メールテンプレート ハイブリッド運用ガイド

作成日: 2026-04-15

## 方式

メールは **React Email コンポーネントでレイアウト固定**、
**可変テキスト（挨拶文、見出し、結び など）だけ DB から差し替え** するハイブリッド方式。

- フォント・色・配置・レイアウト: コードで管理
- 文言: 管理画面 /admin/collections/email-templates で編集可能

## 対応テンプレート

| slug | 用途 | 現状の対応状況 |
|------|------|------|
| order-confirm | 注文確認メール | bodyBlocks 対応済み |
| order-status-update | ステータス更新メール | 未対応（Phase 3 以降） |
| welcome | 会員登録ウェルカム | 未対応 |
| points-earned | ポイント付与通知 | 未対応 |
| password-reset | パスワードリセット | 未対応 |

## ブロックキー一覧（order-confirm）

| blockKey | 用途 | コード内デフォルト文言 |
|----------|------|--------|
| greeting | 冒頭挨拶 | 「{{name}} 様、ご注文ありがとうございます。」 |
| intro | 本文導入 | 「以下の内容でご注文を承りました。内容をご確認ください。」 |
| bank_transfer_lead | 銀行振込ブロックの上部導入文 | 「以下の口座までお振込みをお願いいたします...」 |
| thanks_message | 結び | 「この度はご注文いただきありがとうございました。」 |
| footer_note | フッタ補足 | お問い合わせ案内 + ショップ名 |

## 使用可能な変数

`{{変数名}}` の形式で本文に埋め込み可能:

- `{{name}}` — お客様名
- `{{orderNumber}}` — 注文番号
- 今後追加予定: `{{totalAmount}}`, `{{deliveryAddress}}` など

## 編集手順

1. /admin/collections/email-templates にアクセス
2. 「ご注文確認メール」(slug=order-confirm) を開く
3. 「本文ブロック（ハイブリッド方式）」セクションを展開
4. 対象ブロックの「内容」を編集
5. 保存
6. 次の注文メール送信時から反映（キャッシュなし）

## フォールバック挙動

- bodyBlocks が空 → 各ブロックはコードのデフォルト文言
- slug が存在しない → 全ブロックコードのデフォルト文言
- renderEmailBlocks が失敗 → 空 blocks を返しコードのデフォルト文言

regression なしで安全に運用可能。

## DB マイグレーション手順（初回のみ）

Payload CMS が起動時に自動でテーブルを作成しない場合は、手動で以下を実行:

```bash
# テーブルが存在するか確認（存在すれば不要）
node scripts/db-add-email-templates-body-blocks.mjs --dry-run

# テーブル作成（冪等: IF NOT EXISTS）
node scripts/db-add-email-templates-body-blocks.mjs
```

## seed スクリプト

```bash
# 投入内容を確認
node scripts/seed-email-templates.mjs --dry-run

# 本番投入（冪等: 既存 bodyBlocks は削除してから再挿入）
node scripts/seed-email-templates.mjs
```

## 今後のロードマップ

- Welcome / PointsEarned / OrderStatusUpdate の bodyBlocks 化
- パスワードリセット（Phase E との連携）
- ブロック単位のプレビュー機能
- リッチエディタ（Lexical）導入
- 完全 DB 駆動（方式 β）への移行（本番切替後）
