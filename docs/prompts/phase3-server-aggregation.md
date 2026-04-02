# Phase 3 — サーバーサイド集計ロジックの実装

ダッシュボードに表示する各種KPIを、ハードコード値から実データ集計に切り替える。

---

## 前提確認（最初に実行）

以下を確認して報告してください:

1. `payload.config.ts` の内容（Collections一覧）
2. Orders コレクションのフィールド定義（特に customer, status, total/price, createdAt）
3. Users コレクションのフィールド定義
4. 現在のダッシュボード用エンドポイント（もしあれば）のファイルパスと内容
5. Payload のバージョン（`package.json` から確認）

報告後、次のステップに進んでください。

---

## Step 1: ダッシュボード用カスタムエンドポイント作成

`GET /api/dashboard/stats` エンドポイントを作成してください。

### リクエストパラメータ

```
period: 'today' | 'week' | 'month' | 'custom'
startDate?: string  // custom時のみ（ISO 8601）
endDate?: string    // custom時のみ（ISO 8601）
```

### レスポンス構造

```typescript
interface DashboardStats {
  // KPIカード用
  revenue: number;           // 選択期間の売上合計
  orderCount: number;        // 選択期間の注文数
  pendingCount: number;      // 要対応（保留中 + 入金待ち）の件数
  shippingToday: number;     // 本日の配送件数
  shippingTomorrow: number;  // 明日の配送件数

  // 前期比較
  prevRevenue: number;       // 前期間の売上合計
  prevOrderCount: number;    // 前期間の注文数
  revenueChangeRate: number; // 売上の前期比（%）
  orderChangeRate: number;   // 注文数の前期比（%）

  // チャート用
  revenueChart: Array<{
    date: string;    // ISO日付
    label: string;   // 表示ラベル（"4/1(火)" 等）
    revenue: number;
  }>;

  // 注文ステータス分布
  statusDistribution: {
    pending: number;
    awaitingPayment: number;
    confirmed: number;
    preparing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };

  // 最近の注文
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;

  // 人気商品
  topProducts: Array<{
    name: string;
    salesCount: number;
    revenue: number;
  }>;

  // クイック指標
  quickStats: {
    conversionRate: number | null;  // GA4連携前はnull
    avgOrderValue: number;          // 平均注文額
    repeatRate: number;             // リピート率
    avgLTV: number;                 // 平均LTV
    newMembersCount: number;        // 選択期間の新規会員数
  };
}
```

---

## Step 2: 前期比較ロジック

現在「前週比 +12.4%」「前週比 +8.2%」がハードコードされている。
これを実データの前期比較に置き換えてください。

### 比較期間のルール

```
「本日」選択時 → 前日と比較
「今週」選択時 → 先週（同じ曜日範囲）と比較
「今月」選択時 → 先月と比較
「カスタム」選択時 → 同じ日数分の直前期間と比較
  例: 4/1〜4/30 を選択 → 3/2〜3/31 と比較
```

### 変化率の計算

```typescript
function calcChangeRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
  // 小数点1桁まで
}
```

### フロントエンド表示

```
正の値: 緑色で「前週比 +12.4%」
負の値: 赤色で「前週比 -5.2%」
0: グレーで「前週比 ±0%」
データ不足（前期間のデータが無い）: グレーで「--」
```

「前週比」のラベルも動的に:
- 本日 → 「前日比」
- 今週 → 「前週比」
- 今月 → 「前月比」
- カスタム → 「前期比」

---

## Step 3: リピート率の集計

### 計算ロジック

```typescript
// Ordersコレクションからcustomerフィールドでグループ化
// ※ customerフィールドの実際の名前は Step 0 で確認した結果に合わせる

async function calcRepeatRate(payload): Promise<number> {
  const orders = await payload.find({
    collection: 'orders',
    limit: 0, // 全件取得（countのみ必要なら aggregation を使う）
    where: {
      status: { not_equals: 'cancelled' },
    },
  });

  // customerごとの注文回数を集計
  const customerOrderCounts = new Map<string, number>();
  for (const order of orders.docs) {
    const customerId = typeof order.customer === 'object'
      ? order.customer.id
      : order.customer;
    if (customerId) {
      customerOrderCounts.set(
        customerId,
        (customerOrderCounts.get(customerId) || 0) + 1
      );
    }
  }

  const totalCustomers = customerOrderCounts.size;
  if (totalCustomers === 0) return 0;

  const repeatCustomers = [...customerOrderCounts.values()]
    .filter(count => count >= 2).length;

  return Math.round((repeatCustomers / totalCustomers) * 1000) / 10;
}
```

**注意**: 上記は概念的なコードです。
実際のフィールド名（customer, status 等）は Step 0 で確認した
コレクション定義に合わせて調整してください。

データ量が多い場合は MongoDB の aggregation pipeline を
直接使うことも検討してください（Payload の `payload.db` 経由）。

---

## Step 4: 平均LTV の集計

### 計算ロジック

```typescript
async function calcAvgLTV(payload): Promise<number> {
  // キャンセル以外の全注文の売上合計
  const totalRevenue = /* 全注文のamount合計 */;

  // ユニーク購入者数（1回以上注文したユーザー数）
  const uniqueCustomers = /* customerフィールドのdistinct count */;

  if (uniqueCustomers === 0) return 0;
  return Math.round(totalRevenue / uniqueCustomers);
}
```

---

## Step 5: 平均注文額の集計

```typescript
async function calcAvgOrderValue(payload, period): Promise<number> {
  // 選択期間内のキャンセル以外の注文
  const orders = /* 期間内の注文を取得 */;

  if (orders.length === 0) return 0;
  const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
  return Math.round(totalRevenue / orders.length);
}
```

---

## Step 6: 新規会員数の集計

```typescript
// Usersコレクションの createdAt が選択期間内のユーザー数
async function calcNewMembers(payload, startDate, endDate): Promise<number> {
  const result = await payload.find({
    collection: 'users',
    where: {
      createdAt: {
        greater_than_equal: startDate,
        less_than_equal: endDate,
      },
    },
    limit: 0,
  });
  return result.totalDocs;
}
```

---

## Step 7: コンバージョン率の暫定対応

GA4連携（Phase 4）が完了するまでは `null` を返す。
フロントエンドでは `null` の場合「--」を表示。

```typescript
quickStats: {
  conversionRate: null, // TODO: Phase 4 で GA4 Data API から取得
  ...
}
```

---

## Step 8: フロントエンドの接続

ダッシュボードコンポーネントを修正し、
モックデータや固定値の代わりに `/api/dashboard/stats` からデータを取得。

### 確認事項
- 期間タブ切り替え時にAPIを再呼び出し
- ローディング状態の表示（スケルトンまたはスピナー）
- エラー時のフォールバック表示
- 全てのハードコード値（3.2%, 34.5%, +12.4%, +8.2% 等）が
  API レスポンスの値に置き換わっていることを確認

---

## 作業順序

1. Step 0: 前提確認 → 報告
2. Step 1: エンドポイント骨格作成
3. Step 2: 前期比較ロジック
4. Step 3-6: 各指標の集計ロジック（まとめて実装してOK）
5. Step 7: コンバージョン率の暫定対応
6. Step 8: フロントエンド接続

各ステップ完了後に、変更ファイルと動作状況を報告してください。
特に Step 0 の報告は重要です — コレクション定義が分からないと
以降のコードが正しく書けないため、必ず最初に確認してください。
