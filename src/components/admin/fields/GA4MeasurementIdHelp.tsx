'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】
1. Google Analytics (https://analytics.google.com/) にアクセス
2. 管理（左下の歯車）→ データストリーム → ウェブストリームを選択
3. 「測定ID」（G- で始まる文字列）をコピー
4. この欄に貼り付けて保存

この値を設定すると、ECサイトのフロントエンドに
GA4 の計測タグ（gtag.js）が自動で埋め込まれます。`

export default function GA4MeasurementIdHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
