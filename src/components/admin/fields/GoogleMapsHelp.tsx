'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】

■ Google Maps API キーの取得

1. Google Cloud Console (https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択（または新規作成）
3. 左メニュー「APIとサービス」→「ライブラリ」
4. 「Distance Matrix API」を検索して「有効化」
5. 左メニュー「APIとサービス」→「認証情報」
6. 「認証情報を作成」→「APIキー」
7. 作成されたキーをコピー

■ API キーの制限（推奨）
- 「APIキーを編集」→「APIの制限」で Distance Matrix API のみ許可
- 本番サーバーの IP アドレスで制限するとより安全です

■ 用途
- 配送先住所から uballoon 拠点（東京都港区）までの距離を計算
- 配送料の自動算出に使用します

■ キーが未設定の場合
- モックモード（10km 固定）で動作します
- 配送料計算の精度が低下するため、本番環境では設定を推奨

【セキュリティ】
- API キーは保存時に自動で暗号化されます`

export default function GoogleMapsHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
