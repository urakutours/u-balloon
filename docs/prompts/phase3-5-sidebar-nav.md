# Phase 3.5 — 左メニュー再構成

Payloadデフォルトのサイドバーを、カテゴリ別に集約したカスタムナビゲーションに変更する。

---

## 前提確認（最初に実行）

1. Payload のバージョンを確認（v2.x か v3.x かで実装方法が大きく異なる）
2. 現在の `payload.config.ts` の admin 設定を確認
3. 既存のカスタム admin コンポーネントがあれば確認
4. 現在登録されている全 Collections の slug 一覧を確認

**確認結果を報告してから次に進んでください。**

---

## メニュー構造の定義

現在のPayloadデフォルトメニューの項目を、以下の7カテゴリに集約する。

### 対応表

```
概要（ダッシュボード）
  → /admin（ダッシュボードビュー）

注文管理
  → 注文         /admin/collections/orders
  → 注文変更履歴   /admin/collections/order-changes（※slug名は要確認）
  → 定期便プラン   /admin/collections/subscription-plans
  → 定期便契約    /admin/collections/subscriptions

商品
  → 商品         /admin/collections/products

顧客
  → ユーザー      /admin/collections/users
  → ポイント履歴   /admin/collections/point-history

サイト管理
  → 固定ページ    /admin/collections/pages
  → ブログ記事    /admin/collections/posts
  → フォーム      /admin/collections/forms
  → お問い合わせ受信 /admin/collections/form-submissions（※slug名は要確認）

販促
  → クーポン・割引    /admin/collections/coupons
  → シークレットセール /admin/collections/secret-sales
  → A/Bテスト       /admin/collections/ab-tests

メルマガ
  → メルマガ購読者   /admin/collections/newsletter-subscribers
  → メルマガ配信    /admin/collections/newsletters
```

**重要**: 上記のslug名は推測です。
Step 0 で確認した実際のslug名に置き換えてください。

---

## Step 1: 実装方法の選定

Payloadバージョンに応じて適切な方法を選んでください。

### Payload v3.x の場合

`payload.config.ts` の `admin.components.Nav` でカスタムナビコンポーネントを指定:

```typescript
// payload.config.ts
export default buildConfig({
  admin: {
    components: {
      Nav: '/components/CustomNav',  // カスタムナビのパス
    },
  },
  // ...
});
```

### Payload v2.x の場合

`admin.components.beforeNavLinks` や `admin.components.afterNavLinks` で
カスタムナビを差し込むか、webpack alias でデフォルトNavを上書き。

### どちらの場合も

- Payloadの公式ドキュメントで推奨されている方法を採用する
- デフォルトのナビゲーションを完全に隠すのではなく、
  カスタムナビからPayloadの各Collection管理画面にリンクする

**選定した方法とその理由を報告してください。**

---

## Step 2: カスタムナビコンポーネント実装

### コンポーネント仕様

```
┌──────────────────────┐
│ [EC] My Store        │  ← ロゴ（リンク先: /admin）
│      ダッシュボード    │
├──────────────────────┤
│ □ 概要        ←active │  ← /admin へリンク
│ □ 注文管理     (3)    │  ← クリックでサブメニュー展開
│   ├ 注文              │
│   ├ 注文変更履歴       │
│   ├ 定期便プラン       │
│   └ 定期便契約         │
│ □ 商品               │  ← 単一Collection、サブメニュー不要
│ □ 顧客               │  ← クリックでサブメニュー展開
│   ├ ユーザー          │
│   └ ポイント履歴       │
│ □ サイト管理          │
│   ├ 固定ページ        │
│   ├ ブログ記事        │
│   ├ フォーム          │
│   └ お問い合わせ受信   │
│ □ 販促               │
│   ├ クーポン・割引     │
│   ├ シークレットセール  │
│   └ A/Bテスト         │
│ □ メルマガ            │
│   ├ メルマガ購読者     │
│   └ メルマガ配信       │
├──────────────────────┤
│ ⚙ 設定              │  ← /admin/account 等へリンク
└──────────────────────┘
```

### デザイン仕様

デザインリファレンス: `/docs/design/ec-dashboard-v2.jsx` の
サイドバー部分に合わせてください。

- **サイドバー幅**: 220px
- **背景色**:
  - ライト: `#ffffff`、右ボーダー `1px solid #e2e8f0`
  - ダーク: `#1e293b`、右ボーダー `1px solid #334155`
- **ロゴ**: 32x32px の紫グラデーション角丸ボックスに「EC」
- **ナビ項目**: 
  - `font-size: 13.5px`、`padding: 10px 12px`、`border-radius: 10px`
  - アクティブ: アクセントカラー背景（6%透過）+ アクセントカラー文字
  - ホバー: 薄い背景色
  - 通常: `color: #64748b`（ライト）/ `#94a3b8`（ダーク）
- **サブメニュー**:
  - 親項目クリックで展開/折りたたみ（アニメーション付き）
  - インデント: 左に `padding-left: 36px`
  - `font-size: 13px`
  - 展開時に親項目の右に ▼、折りたたみ時に ▶（小さい矢印）
- **バッジ**（注文管理）:
  - 要対応件数を赤丸バッジで表示
  - データは `/api/dashboard/stats` の `pendingCount` を使用
  - `background: #ef4444`、`color: white`、`font-size: 10px`、`border-radius: 10px`
- **アイコン**: 各カテゴリにSVGアイコン（モックアップ参照）
  - 概要: グリッド
  - 注文管理: ショッピングバッグ
  - 商品: タグ
  - 顧客: ユーザーグループ
  - サイト管理: ペン
  - 販促: メダル/アワード
  - メルマガ: メール
  - 設定: 歯車

### アクティブ状態の判定

現在のURLパスに基づいてアクティブ項目を判定:

```typescript
// 例: /admin/collections/orders → 「注文管理」がアクティブ
const NAV_CONFIG = [
  {
    label: '概要',
    href: '/admin',
    matchExact: true, // /admin のみにマッチ
  },
  {
    label: '注文管理',
    matchPrefix: ['/admin/collections/orders', '/admin/collections/order-changes', ...],
    children: [
      { label: '注文', href: '/admin/collections/orders' },
      { label: '注文変更履歴', href: '/admin/collections/order-changes' },
      ...
    ],
  },
  // ...
];
```

- 子ページにアクセスしたとき、親カテゴリもアクティブ表示にする
- 子ページにアクセスしたとき、サブメニューは自動展開

---

## Step 3: テーマ対応

Payload のテーマ機能（ダーク/ライト切り替え）がある場合:
- PayloadのThemeProviderやテーマ状態を取得して連動させる
- カスタムナビのスタイルもテーマに応じて切り替える

Payload にテーマ機能が無い場合:
- ダッシュボードで実装したテーマ切り替え状態を共有
  （Context または localStorage 経由）

---

## Step 4: 動作確認

以下を確認してください:

1. 全カテゴリのリンクが正しいCollectionページに遷移するか
2. サブメニューの展開/折りたたみが動作するか
3. URLに応じたアクティブ状態が正しいか
4. 注文管理のバッジに件数が表示されるか
5. ダーク/ライトモードで正しく表示されるか
6. ブラウザの戻る/進むボタンでアクティブ状態が追従するか

---

## 作業順序

1. Step 0: 前提確認 → 報告（必須）
2. Step 1: 実装方法の選定 → 報告
3. Step 2: カスタムナビコンポーネント実装
4. Step 3: テーマ対応
5. Step 4: 動作確認 → 結果報告
