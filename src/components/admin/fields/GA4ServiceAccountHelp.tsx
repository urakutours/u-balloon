'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】（初回のみ・約10分）

■ Step 1: Google Cloud でサービスアカウントを作成

1. Google Cloud Console (https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 左メニュー「APIとサービス」→「ライブラリ」
4. 「Google Analytics Data API」を検索して「有効化」
5. 左メニュー「APIとサービス」→「認証情報」
6. 「認証情報を作成」→「サービスアカウント」
7. 名前を入力（例: ga4-dashboard）→ 作成
8. ロールの選択はスキップしてOK → 完了
9. 作成されたサービスアカウントのメールアドレスをコピー
   （例: ga4-dashboard@project-id.iam.gserviceaccount.com）
10. この欄に貼り付けて保存

■ Step 2: サービスアカウントの秘密鍵を取得

1. 作成したサービスアカウントをクリック
2. 「鍵」タブ →「鍵を追加」→「新しい鍵を作成」
3. 形式「JSON」を選択 → 作成
4. JSONファイルがダウンロードされる
5. ファイルの中身を環境変数に設定:
   GA4_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ※ JSONの内容を1行にしてシングルクォートで囲む

■ Step 3: GA4 にアクセス権を付与

1. Google Analytics (https://analytics.google.com/) に戻る
2. 管理 → プロパティのアクセス管理
3. 「＋」→「ユーザーを追加」
4. メールアドレス: Step 1 でコピーしたサービスアカウントメール
5. 権限: 「閲覧者」を選択 → 追加

※ 秘密鍵（JSONファイル）はセキュリティ上、
  この画面ではなく環境変数で管理します。
  サーバーの .env ファイルに追加してください。

【トラブルシューティング】
- コンバージョン率が「--」のまま
  → プロパティIDが正しいか確認
  → 環境変数 GA4_SERVICE_ACCOUNT_KEY が設定されているか確認
  → GA4でサービスアカウントに「閲覧者」権限があるか確認
  → 設定後24〜48時間はデータが反映されないことがあります`

export default function GA4ServiceAccountHelp() {
  return <HelpToggle buttonLabel="設定方法を見る（詳細）" content={CONTENT} />
}
