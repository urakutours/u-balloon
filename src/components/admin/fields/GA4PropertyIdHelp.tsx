'use client'

import React from 'react'
import { HelpToggle } from './HelpToggle'

const CONTENT = `【設定手順】
1. Google Analytics (https://analytics.google.com/) にアクセス
2. 管理（左下の歯車）→ プロパティ設定
3. 右上に表示される「プロパティID」（9桁の数字）をコピー
4. この欄に貼り付けて保存

※ 測定ID（G-XXXXXXX）とは別の値です
※ この値を設定すると、ダッシュボードに
　 セッション数やPV数などのGA4データが表示されます`

export default function GA4PropertyIdHelp() {
  return <HelpToggle buttonLabel="設定方法を見る" content={CONTENT} />
}
