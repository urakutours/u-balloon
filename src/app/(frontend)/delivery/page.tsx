import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import type { Metadata } from 'next'
import { getStaticPage } from '@/lib/get-static-page'
import { BlockRenderer } from '@/components/blocks/BlockRenderer'
import { getSiteSettings } from '@/lib/site-settings'
import { getActiveSortedPlans } from '@/lib/shipping'

function carrierLabel(carrier: string): string {
  switch (carrier) {
    case 'yamato': return 'ヤマト運輸'
    case 'sagawa': return '佐川急便'
    case 'yupack': return 'ゆうパック'
    case 'self_delivery': return 'u-balloon デリバリー便（自社配送）'
    default: return 'その他'
  }
}

function methodLabel(method: string): string {
  switch (method) {
    case 'flat': return '一律料金'
    case 'distance_based': return '距離ベース（基本料金 + 超過分）'
    case 'regional_table': return '地域別固定'
    case 'free': return '送料無料'
    default: return method
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getStaticPage('delivery')
  return {
    title: page?.meta?.title || page?.title || 'ご利用ガイド',
    description: page?.meta?.description || 'uballoon（ユーバルーン）のご注文方法・お支払い・配送・返品について。バルーンギフト・バルーン電報をお届けします。',
  }
}

const FALLBACK_SHIPPING_RATES = [
  { area: '関東（東京・神奈川・千葉・埼玉・茨城・栃木・群馬・山梨）', rate: '無料' },
  { area: '信越（新潟・長野）', rate: '無料' },
  { area: '北陸（富山・石川・福井）', rate: '無料' },
  { area: '東海（静岡・愛知・岐阜・三重）', rate: '無料' },
  { area: '南東北（宮城・山形・福島）', rate: '無料' },
  { area: '関西（大阪・京都・兵庫・奈良・滋賀・和歌山）', rate: '200円' },
  { area: '中国（鳥取・島根・岡山・広島・山口）', rate: '400円' },
  { area: '四国（徳島・香川・愛媛・高知）', rate: '400円' },
  { area: '北海道', rate: '700円' },
  { area: '北東北（青森・秋田・岩手）', rate: '700円' },
  { area: '九州（福岡・佐賀・長崎・熊本・大分・宮崎・鹿児島）', rate: '800円' },
]

const deliveryDays = [
  { area: '関東', days: '翌日' },
  { area: '信越・北陸・東海・南東北', days: '翌日' },
  { area: '北東北・関西', days: '翌日〜翌々日' },
  { area: '中国・四国', days: '翌々日' },
  { area: '九州', days: '2〜3日' },
  { area: '北海道', days: '2〜3日' },
]

const deliveryService = [
  { distance: '当店から5km以内', price: '1,200円' },
  { distance: '5km超', price: '1,200円 + 200円/km' },
]

export default async function DeliveryPage() {
  const [cmsPage, settings] = await Promise.all([
    getStaticPage('delivery'),
    getSiteSettings().catch(() => null),
  ])

  // 配送プラン駆動
  const activePlans = getActiveSortedPlans(settings?.shippingPlans)
  // 配送業者一覧（重複除去）
  const uniqueCarriers = activePlans.length > 0
    ? [...new Set(activePlans.map(p => carrierLabel(p.carrier)))].join('、')
    : null
  // 地域別送料フォールバック: shippingPlans 未設定時に使用
  const dbFees = settings?.shippingRegionalFees
  const shippingRates = dbFees && dbFees.length > 0
    ? dbFees.map(item => ({
        area: item.region,
        rate: item.fee === 0 ? '無料' : `${item.fee.toLocaleString()}円`,
      }))
    : FALLBACK_SHIPPING_RATES

  // 連絡先情報 — Per-instance values from SiteSettings (admin GUI).
  // No shop-specific hardcoded fallbacks: empty string forces operator setup.
  const companyPhone = settings?.companyPhone ?? ''
  const businessHours = settings?.companyBusinessHours ?? ''
  const contactEmail = settings?.companyContactEmail ?? ''

  // 銀行振込情報 — Per-instance values from SiteSettings.
  const bankName = settings?.bankName ?? ''
  const bankBranchName = settings?.bankBranchName ?? ''
  const bankAccountType = settings?.bankAccountType === 'checking' ? '当座' : '普通'
  const bankAccountNumber = settings?.bankAccountNumber ?? ''
  const bankAccountHolder = settings?.bankAccountHolder ?? ''
  const bankDeadlineDays = settings?.bankTransferDeadlineDays ?? 7

  if (cmsPage?.layout?.length) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand-pink-light">
          <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 text-sm text-brand-dark/60">
            <Link href="/" className="flex items-center gap-1 transition-colors hover:text-brand-dark">
              <Home className="h-3.5 w-3.5" />
              ホーム
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-brand-dark">{cmsPage.title}</span>
          </div>
        </div>
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">{cmsPage.title}</h1>
          </div>
          <BlockRenderer blocks={cmsPage.layout} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="bg-brand-pink-light">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3 text-sm text-brand-dark/60">
          <Link href="/" className="flex items-center gap-1 transition-colors hover:text-brand-dark">
            <Home className="h-3.5 w-3.5" />
            ホーム
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-brand-dark">ご利用ガイド</span>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-brand-teal sm:text-3xl">
            ご利用ガイド
          </h1>
        </div>

        <div className="rounded-xl border p-6 sm:p-8">
          <div className="space-y-10">

            {/* ご注文方法 */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">ご注文方法</h2>
              <ol className="list-decimal space-y-2 pl-6 text-sm leading-relaxed text-gray-700">
                <li>商品ページで商品を選び、「カートに追加」ボタンをクリックします。</li>
                <li>カート画面で数量やオプションを確認します。</li>
                <li>「ご購入手続きへ」ボタンをクリックします。</li>
                <li>お届け先情報・お支払い方法を入力します。</li>
                <li>注文内容を確認し、「注文を確定する」をクリックして完了です。</li>
              </ol>
              <p className="mt-4 text-sm text-gray-700">
                ご注文確定後、確認メールをお送りいたします。メールが届かない場合は、迷惑メールフォルダをご確認いただくか、お問い合わせください。
              </p>
            </section>

            <div className="border-b" />

            {/* お支払い方法 */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">お支払い方法</h2>

              <h3 className="mb-2 text-sm font-semibold text-brand-dark">クレジットカード</h3>
              <p className="text-sm text-gray-700">
                以下のクレジットカードがご利用いただけます。お支払いは一括払いのみとなります。
              </p>
              <p className="mt-2 text-sm font-medium text-gray-700">
                VISA / Mastercard / American Express / JCB / Diners Club / Discover
              </p>
              <p className="mt-2 text-sm text-gray-700">
                SSL暗号化技術によりカード情報は安全に保護されます。カード会社発行のご利用明細書が領収書の代わりとなります。
              </p>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">銀行振込（前払い）</h3>
              <p className="text-sm text-gray-700">
                {bankName}　{bankBranchName}　{bankAccountType} {bankAccountNumber}　{bankAccountHolder}
              </p>

              <div className="mt-4 rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-semibold text-brand-dark">銀行振込のご注意</p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>・振込手数料はお客様のご負担となります。</li>
                  <li>・発送予定日の{bankDeadlineDays}日前までにお振込みをお願いいたします。発送予定日はご注文確定後にお知らせいたします。</li>
                  <li>・ご入金確認後の発送となります。</li>
                  <li>・12:00までにご入金が確認できた場合、当日の発送手配が可能です（在庫状況による）。</li>
                </ul>
              </div>
            </section>

            <div className="border-b" />

            {/* 配送について */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">配送について</h2>

              <h3 className="mb-2 text-sm font-semibold text-brand-dark">配送業者</h3>
              <p className="text-sm text-gray-700">
                {uniqueCarriers ?? 'ヤマト運輸またはゆうパック'}にて発送いたします。商品やお届け先に応じて最適な方法を選択しております。
              </p>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">送料・配送プラン</h3>
              {activePlans.length > 0 ? (
                <div className="space-y-4">
                  {activePlans.map((plan) => (
                    <div key={plan.id ?? plan.name} className="overflow-hidden rounded-lg border">
                      <div className="bg-gray-50 px-4 py-3">
                        <p className="font-semibold text-gray-800">{plan.name}</p>
                        <p className="text-xs text-gray-500">{carrierLabel(plan.carrier)} / {methodLabel(plan.calculationMethod)}</p>
                      </div>
                      <div className="px-4 py-3">
                        <table className="w-full text-sm">
                          <tbody className="divide-y">
                            <tr>
                              <td className="py-2 font-medium text-gray-700 w-1/3">料金</td>
                              <td className="py-2 text-gray-700">
                                {plan.calculationMethod === 'flat' && `一律 ¥${(plan.baseFee ?? 0).toLocaleString()}（税込）`}
                                {plan.calculationMethod === 'distance_based' && (
                                  <>
                                    基本料金 ¥{(plan.baseFee ?? 0).toLocaleString()}（{plan.freeDistanceKm ?? 0}km まで）、超過分 ¥{plan.extraPerKmFee ?? 0}/km
                                    {plan.freeThreshold && <>、¥{plan.freeThreshold.toLocaleString()}以上で送料無料</>}
                                  </>
                                )}
                                {plan.calculationMethod === 'free' && '送料無料'}
                                {plan.calculationMethod === 'regional_table' && '地域別（下表参照）'}
                              </td>
                            </tr>
                            {(plan.estimatedDaysMin != null || plan.estimatedDaysMax != null) && (
                              <tr>
                                <td className="py-2 font-medium text-gray-700">配送日数目安</td>
                                <td className="py-2 text-gray-700">
                                  発送から {plan.estimatedDaysMin ?? '-'}〜{plan.estimatedDaysMax ?? '-'} 日
                                </td>
                              </tr>
                            )}
                            {plan.supportedAreas && (
                              <tr>
                                <td className="py-2 font-medium text-gray-700">対応エリア</td>
                                <td className="py-2 text-gray-700">{plan.supportedAreas}</td>
                              </tr>
                            )}
                            {plan.restrictedAreas && (
                              <tr>
                                <td className="py-2 font-medium text-gray-700">配送不可</td>
                                <td className="py-2 text-gray-700">{plan.restrictedAreas}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        {plan.calculationMethod === 'regional_table' && plan.regionalFees.length > 0 && (
                          <div className="mt-3 overflow-hidden rounded border">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">地域</th>
                                  <th className="px-3 py-2 text-right font-medium text-gray-700">料金（税込）</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {plan.regionalFees.map((r, i) => (
                                  <tr key={i} className="even:bg-muted/20">
                                    <td className="px-3 py-2 text-gray-700">{r.region}</td>
                                    <td className="px-3 py-2 text-right text-gray-700">¥{r.fee.toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-700">お届け地域</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">送料（税込）</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {shippingRates.map((row) => (
                        <tr key={row.area} className="even:bg-muted/20">
                          <td className="px-4 py-2.5 text-gray-700">{row.area}</td>
                          <td className="px-4 py-2.5 text-gray-700">{row.rate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="mb-1 text-sm font-semibold text-gray-800">沖縄県・離島のお届けについて</p>
                <p className="text-sm text-gray-700">
                  バルーンはヘリウムガスで膨らませているため、航空輸送時の気圧変化により破裂する恐れがあります。そのため、<strong>沖縄県への配送はお受けできません。</strong>
                  <br />
                  離島へのお届けも、配送ルートによってはお受けできない場合がございます。事前にお問い合わせください。
                </p>
              </div>

              {activePlans.length === 0 && (
                <>
                  <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">配送日数の目安（東京から発送）</h3>
                  <div className="overflow-hidden rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left font-medium text-gray-700">お届け地域</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">お届け日数の目安</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {deliveryDays.map((row) => (
                          <tr key={row.area} className="even:bg-muted/20">
                            <td className="px-4 py-2.5 text-gray-700">{row.area}</td>
                            <td className="px-4 py-2.5 text-gray-700">{row.days}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              <p className="mt-3 text-xs text-gray-500">
                ※上記は目安です。天候や交通状況、繁忙期等により遅延する場合がございます。
                <br />
                ※土日祝日は発送業務をお休みしております。
              </p>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">配送時間帯指定</h3>
              <p className="text-sm text-gray-700">以下の時間帯からお届け時間をご指定いただけます。</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-gray-700">
                <li>午前中</li>
                <li>14:00〜16:00</li>
                <li>16:00〜18:00</li>
                <li>18:00〜20:00</li>
                <li>19:00〜21:00</li>
              </ul>
              <p className="mt-2 text-xs text-gray-500">※交通状況等により、ご指定の時間帯にお届けできない場合がございます。</p>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">直接お届けサービス</h3>
              <p className="text-sm text-gray-700">
                東京都港区周辺のお届け先に限り、スタッフが直接お届けするサービスをご利用いただけます。
              </p>
              <div className="mt-3 overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-medium text-gray-700">距離</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-700">料金（税込）</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {deliveryService.map((row) => (
                      <tr key={row.distance} className="even:bg-muted/20">
                        <td className="px-4 py-2.5 text-gray-700">{row.distance}</td>
                        <td className="px-4 py-2.5 text-gray-700">{row.price}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-sm text-gray-700">
                ご希望の方はお問い合わせフォームまたはお電話にてご相談ください。
              </p>
            </section>

            <div className="border-b" />

            {/* バルーンに関するご注意 */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">バルーンに関するご注意</h2>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-2 text-sm font-semibold text-brand-dark">ヘリウムガスについて</p>
                <p className="text-sm leading-relaxed text-gray-700">
                  バルーンはヘリウムガスで膨らませてお届けしております。気圧や気温の変化によりガスの体積が変動するため、配送中のバルーン破裂を防ぐために若干少なめに充填しております。
                </p>
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  お届け時にバルーンの浮力が弱く感じられる場合は、商品に同梱しているストローで空気を吹き込んで調整してください。
                </p>
              </div>
            </section>

            <div className="border-b" />

            {/* 返品・交換について */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">返品・交換について</h2>

              <h3 className="mb-2 text-sm font-semibold text-brand-dark">お客様のご都合による返品</h3>
              <p className="text-sm text-gray-700">
                バルーン商品の性質上（膨張済み・ヘリウムガス充填済み）、お客様のご都合による返品・交換はお受けできません。あらかじめご了承ください。
              </p>

              <h3 className="mb-2 mt-6 text-sm font-semibold text-brand-dark">配送中の破損・不良品の場合</h3>
              <p className="text-sm text-gray-700">
                万が一、配送中の破損や不良品がございましたら、商品到着後3日以内にご連絡ください。
              </p>
              <p className="mt-2 text-sm text-gray-700">状況を確認のうえ、以下のいずれかで対応いたします。</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-gray-700">
                <li>同一商品の再発送</li>
                <li>代替商品がない場合はご返金</li>
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                ※バルーン商品の性質上、状況に応じて商品の処分をお願いする場合がございます（返送は不要です）。
              </p>
            </section>

            <div className="border-b" />

            {/* メッセージカードについて */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">メッセージカードについて</h2>
              <p className="text-sm text-gray-700">
                メッセージカードを無料でお付けいたします。ご注文時の備考欄にメッセージ内容をご記入ください。
              </p>
            </section>

            <div className="border-b" />

            {/* 営業日・お問い合わせ */}
            <section>
              <h2 className="mb-4 text-lg font-semibold text-brand-dark">営業日・お問い合わせ</h2>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-brand-dark">営業時間</td>
                      <td className="px-4 py-3 text-gray-700">{businessHours}</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-brand-dark">定休日</td>
                      <td className="px-4 py-3 text-gray-700">土曜・日曜・祝日</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-brand-dark">電話番号</td>
                      <td className="px-4 py-3 text-gray-700">{companyPhone}</td>
                    </tr>
                    <tr className="bg-muted/20">
                      <td className="px-4 py-3 font-semibold text-brand-dark">メール</td>
                      <td className="px-4 py-3 text-gray-700">
                        <a href={`mailto:${contactEmail}`} className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80">
                          {contactEmail}
                        </a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-sm text-gray-700">
                メール・お問い合わせフォームは24時間受付しております。通常1〜2営業日以内にご回答いたします。
              </p>
            </section>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-gray-500">
          ご不明な点は
          <Link href="/contact" className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80">
            お問い合わせ
          </Link>
          ページよりお気軽にご連絡ください。
        </p>
      </div>
    </div>
  )
}
