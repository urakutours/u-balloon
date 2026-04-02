# Phase 4 — GA4 連携

Google Analytics 4 の測定タグ埋め込みと、
Data API を使ったコンバージョン率の算出を実装する。

このフェーズは3段階に分かれます。
Step 1・2 はコードのみで完結しますが、
Step 3 は Google Cloud Console での手動設定が必要です。

---

## Step 1: GA4 測定ID の設定UI

### Payload に SiteSettings Global を追加（または既存に追加）

```typescript
// globals/SiteSettings.ts（または既存のGlobalに追加）

{
  slug: 'site-settings',
  label: 'サイト設定',
  access: { read: () => true },
  fields: [
    {
      name: 'ga4MeasurementId',
      label: 'GA4 測定ID',
      type: 'text',
      admin: {
        placeholder: 'G-XXXXXXXXXX',
        description: 'Google Analytics 4 の測定ID。「G-」で始まる文字列を入力してください。',
      },
      validate: (value) => {
        if (value && !/^G-[A-Z0-9]+$/.test(value)) {
          return 'GA4測定IDは「G-」で始まる英数字です（例: G-ABC123DEF4）';
        }
        return true;
      },
    },
    // --- 以下は Step 3 で使用 ---
    {
      name: 'ga4PropertyId',
      label: 'GA4 プロパティID',
      type: 'text',
      admin: {
        placeholder: '123456789',
        description: 'GA4 Data API でデータ取得するためのプロパティID（数字のみ）。Google Analytics の管理画面 > プロパティ設定で確認できます。',
        condition: (data) => !!data?.ga4MeasurementId,
        // 測定IDが入力されている場合のみ表示
      },
    },
    {
      name: 'ga4ServiceAccountEmail',
      label: 'サービスアカウントメール',
      type: 'text',
      admin: {
        placeholder: 'xxxxx@project-id.iam.gserviceaccount.com',
        description: 'GA4 Data API 用のサービスアカウントメールアドレス',
        condition: (data) => !!data?.ga4PropertyId,
      },
    },
    // サービスアカウントの秘密鍵は環境変数で管理（UIには出さない）
  ],
}
```

### 管理画面での設定フロー

設定 > サイト設定 に以下のフィールドが表示される:

```
┌─────────────────────────────────────────┐
│ GA4 測定ID                              │
│ ┌─────────────────────────────────────┐ │
│ │ G-XXXXXXXXXX                        │ │
│ └─────────────────────────────────────┘ │
│ Google Analytics 4 の測定IDを入力       │
│                                         │
│ GA4 プロパティID（測定ID入力後に表示）   │
│ ┌─────────────────────────────────────┐ │
│ │ 123456789                           │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ サービスアカウントメール                 │
│ ┌─────────────────────────────────────┐ │
│ │ xxxxx@project.iam.gserviceaccount...│ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Step 2: フロントエンドへの gtag.js 自動挿入

ECサイトのフロントエンド（公開側）に、GA4 の計測タグを自動で埋め込む。

### 実装方針

SiteSettings から `ga4MeasurementId` を取得し、
値が設定されている場合のみ `<head>` に gtag.js を注入する。

```typescript
// フロントエンドのレイアウトコンポーネント（Next.js の場合の例）

import { getPayloadClient } from '...';

export default async function RootLayout({ children }) {
  const payload = await getPayloadClient();
  const settings = await payload.findGlobal({ slug: 'site-settings' });
  const ga4Id = settings?.ga4MeasurementId;

  return (
    <html>
      <head>
        {ga4Id && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${ga4Id}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### 注意点

- フロントエンドのフレームワーク構成を確認してから実装してください
  （Next.js App Router / Pages Router / その他）
- ga4Id が未設定の場合はスクリプトを一切出力しない
- XSS対策: ga4Id はバリデーション済みだが、念のためエスケープする

### ECサイト側で追加計測するイベント（推奨）

GA4の eコマースイベントを追加すると、コンバージョン計測の精度が上がります。
以下のイベントを該当ページに追加してください:

```javascript
// 商品詳細ページ表示時
gtag('event', 'view_item', {
  currency: 'JPY',
  value: 商品価格,
  items: [{ item_id: '...', item_name: '...' }],
});

// カートに追加時
gtag('event', 'add_to_cart', { ... });

// 購入完了時
gtag('event', 'purchase', {
  transaction_id: 注文ID,
  value: 合計金額,
  currency: 'JPY',
  items: [...],
});
```

これらのイベント実装は必須ではなく推奨です。
まずは基本のページビュー計測（gtag config）だけでも
セッション数は取得できます。

---

## Step 3: GA4 Data API によるデータ取得

### 概要

GA4 Data API v1 を使って、ダッシュボードに
「セッション数（訪問数）」を取得し、コンバージョン率を算出する。

```
コンバージョン率 = (選択期間の注文完了数 / 同期間のセッション数) × 100
```

### 前提条件（手動設定が必要 — コード外の作業）

以下はユーザー（Daisukeさん）が手動で行う設定です。
コードでは対応できないため、手順書として記載します。

```
1. Google Cloud Console でプロジェクトを作成（または既存を使用）
2. 「Google Analytics Data API」を有効化
3. サービスアカウントを作成し、JSONキーをダウンロード
4. GA4 の管理画面で、上記サービスアカウントのメールアドレスに
   「閲覧者」権限を付与
5. JSONキーの内容を環境変数に設定:
   GA4_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key":"..."}
6. Payload の SiteSettings に ga4PropertyId を入力
```

### サーバーサイド実装

```typescript
// lib/ga4.ts

import { BetaAnalyticsDataClient } from '@google-analytics/data';

let client: BetaAnalyticsDataClient | null = null;

function getGA4Client(): BetaAnalyticsDataClient | null {
  if (client) return client;

  const keyJson = process.env.GA4_SERVICE_ACCOUNT_KEY;
  if (!keyJson) return null;

  try {
    const credentials = JSON.parse(keyJson);
    client = new BetaAnalyticsDataClient({ credentials });
    return client;
  } catch {
    console.error('GA4 credentials parse error');
    return null;
  }
}

export async function getGA4Sessions(
  propertyId: string,
  startDate: string,  // 'YYYY-MM-DD'
  endDate: string,
): Promise<number | null> {
  const ga4 = getGA4Client();
  if (!ga4 || !propertyId) return null;

  try {
    const [response] = await ga4.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [{ name: 'sessions' }],
    });

    const sessions = response.rows?.[0]?.metricValues?.[0]?.value;
    return sessions ? parseInt(sessions, 10) : null;
  } catch (error) {
    console.error('GA4 API error:', error);
    return null;
  }
}
```

### ダッシュボードエンドポイントへの統合

Phase 3 で作成した `/api/dashboard/stats` に統合:

```typescript
// GA4 からセッション数を取得
const settings = await payload.findGlobal({ slug: 'site-settings' });
const propertyId = settings?.ga4PropertyId;

let conversionRate: number | null = null;

if (propertyId) {
  const sessions = await getGA4Sessions(propertyId, startDateStr, endDateStr);
  if (sessions && sessions > 0) {
    conversionRate = Math.round((orderCount / sessions) * 1000) / 10;
  }
}

// レスポンスに含める
quickStats: {
  conversionRate, // number | null
  ...
}
```

### npm パッケージ

```bash
npm install @google-analytics/data
```

### エラーハンドリング

- GA4の設定が不完全（測定IDはあるがプロパティIDが無い等）→ `null` を返す
- API呼び出しエラー → ログに記録し `null` を返す（ダッシュボードは壊さない）
- フロントエンドで `null` の場合 → 「--」を表示（Phase 3 で実装済み）

---

## Step 3 完了後の確認事項

1. SiteSettings にGA4測定IDを入力できるか
2. フロントエンドのHTMLソースに gtag.js が出力されるか
3. GA4 リアルタイムレポートでアクセスが計測されているか
4. ダッシュボードにコンバージョン率が数値で表示されるか
   （GA4 Data API が正しく接続されている場合）
5. GA4未設定の状態でダッシュボードがエラーにならないか

---

## 作業順序

1. Step 1: SiteSettings Global の作成/拡張
2. Step 2: フロントエンドへの gtag.js 挿入
3. Step 3: GA4 Data API の実装
   （※ Google Cloud Console の設定は手動。
     設定手順をREADMEまたはドキュメントに記載してください）

Step 1, 2 は連続で実装してOKです。
Step 3 は Google Cloud 側の設定が完了してから動作確認してください。
