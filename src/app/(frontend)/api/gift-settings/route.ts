import { NextResponse } from 'next/server'
import { getSiteSettings } from '@/lib/site-settings'

/**
 * GET /api/gift-settings
 * ギフト設定（ラッピングオプション・メッセージカードテンプレート）を返す公開エンドポイント。
 * checkout ページのクライアントコンポーネントから呼び出される。
 */
export async function GET() {
  try {
    const settings = await getSiteSettings()
    return NextResponse.json({
      wrappingOptions: settings.giftSettingsWrappingOptions ?? [],
      messageCardTemplates: settings.giftSettingsMessageCardTemplates ?? [],
    })
  } catch (err) {
    console.error('[GiftSettings] Error:', err)
    return NextResponse.json(
      { error: 'ギフト設定の取得に失敗しました' },
      { status: 500 },
    )
  }
}
