'use client'

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { detectProductType, type ProductTypeInfo } from '@/lib/product-types'
import { Star, Truck, HelpCircle } from 'lucide-react'

type Props = {
  sku?: string
  tags: string[]
  /** フリンジ系のカスタマイズ商品かどうか（g-prf-0014, g-prf-0019） */
  isFringeCustomize?: boolean
}

export function ProductInfoAccordion({ sku, tags, isFringeCustomize }: Props) {
  const info = detectProductType(sku, tags)

  return (
    <Accordion className="w-full">
      <AboutAccordion info={info} sku={sku} isFringeCustomize={isFringeCustomize} />
      <DeliveryAccordion info={info} sku={sku} />
      <CautionAccordion info={info} />
    </Accordion>
  )
}

// ─── この商品について ───

function AboutAccordion({
  info,
  sku,
  isFringeCustomize,
}: {
  info: ProductTypeInfo
  sku?: string
  isFringeCustomize?: boolean
}) {
  // リリース商品は「この商品について」を表示しない
  if (info.isRelease) return null

  let heading: string
  let content: React.ReactNode

  if (info.isOption) {
    heading = 'オプション商品について'
    content = (
      <>
        <p>オプション商品は、メインのバルーンギフトに追加してお楽しみいただけるアイテムです。</p>
        <p className="mt-2">
          ご注意：<br />
          ・オプション商品だけではご注文いただけません<br />
          ・メインのバルーンギフトと一緒にカートに入れてください<br />
          ・メインギフトと同梱してお届けします
        </p>
      </>
    )
  } else if (info.isHeliumGas) {
    heading = 'ヘリウムガス補充缶です'
    content = (
      <>
        <p>
          フィルムバルーン用の補充ヘリウムガス缶です。<br />
          しぼんできたフィルムバルーンに、ご自宅でガスを補充できます。
        </p>
        <p className="mt-2">
          ・フィルムバルーン専用です（ゴムバルーンには使用できません）<br />
          ・使い方はかんたん — 注入口にノズルを差し込むだけ<br />
          ・ご希望があれば、メッセージカードをお付けしてお届けします
        </p>
      </>
    )
  } else if (info.isCustomize) {
    heading = 'お好みに合わせて自由に組み合わせ'
    const itemType = isFringeCustomize ? 'フリンジ' : 'バルーン'
    content = (
      <>
        <p>
          ・お好きな{itemType}を組み合わせてお選びいただけます<br />
          ・もし、追加のカスタマイズのご要望などがあれば、備考欄などにご記入ください
        </p>
        <p className="mt-2">
          ・ご希望があれば、メッセージカードをお付けしてお届けします（文面は注文画面にてご記入ください）
        </p>
      </>
    )
  } else if (info.isOkigata) {
    heading = 'テーブルなどに置いて楽しむバルーンギフトです'
    content = (
      <>
        <p>
          ヘリウムガスを使わない、テーブルや棚に置いて飾るタイプのバルーンギフトです。<br />
          届いたら箱から出して、お好きな場所にそのまま飾れます。
        </p>
        <p className="mt-2">
          ・ヘリウムガス不使用なので、数週間〜数ヶ月長く楽しめます<br />
          ・お部屋のインテリアとしてもおすすめです<br />
          ・安定して置けるので、小さなお子さまがいるご家庭にも安心<br />
          ・ご希望があれば、メッセージカードをお付けしてお届けします
        </p>
      </>
    )
  } else {
    // デフォルト: ヘリウム浮遊型
    heading = '浮かぶタイプのバルーンです'
    content = (
      <>
        <p>
          ヘリウムガスでふわふわ浮かぶバルーンのギフトセットです。<br />
          届いた箱を開けると、バルーンがふわっと浮かび上がるサプライズ感も楽しめます。
        </p>
        <p className="mt-2">
          ・誕生日、記念日、お祝いなど様々なシーンにぴったり<br />
          ・ゴム（ラテックス）バルーンの浮遊時間は約5〜8時間<br />
          ・フィルムバルーンは約2〜4週間お楽しみいただけます<br />
          ・ご希望があれば、メッセージカードをお付けしてお届けします
        </p>
      </>
    )
  }

  return (
    <AccordionItem value="about">
      <AccordionTrigger className="text-sm font-semibold text-brand-dark">
        <span className="flex items-center gap-2">
          <Star className="h-4 w-4 text-brand-teal" />
          {heading}
        </span>
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed text-foreground/70">
        {content}
      </AccordionContent>
    </AccordionItem>
  )
}

// ─── 配送・取り扱い ───

function DeliveryAccordion({
  info,
  sku,
}: {
  info: ProductTypeInfo
  sku?: string
}) {
  // オプション商品は表示しない
  if (info.isOption) return null

  let heading: string
  let content: React.ReactNode

  if (info.isRelease) {
    heading = 'セレモニー当日の流れ'
    content = (
      <>
        <p><strong>当日の流れ：</strong></p>
        <p className="mt-1">
          1. スタッフが会場にバルーンをお届けします<br />
          　バルーンが束の状態になっており、下におもりがついています
        </p>
        <p className="mt-1">
          2. おもりをカットして、バルーンをお配りしてください<br />
          　バルーンを配ること自体を演出に組み込むことで盛り上がります
        </p>
        <p className="mt-1">3. 合図や音楽と一緒に一斉にバルーンをリリースしてください</p>
        <p className="mt-3"><strong>事前にご相談ください：</strong></p>
        <p className="mt-1">
          ・ご利用日の2週間前までにご注文ください<br />
          ・イベント名やご両家名などをご注文時にお知らせください<br />
          ・バルーンは当日の演出時間の1〜3時間ほど前のお届けになります
        </p>
        <p className="mt-3"><strong>天候について：</strong></p>
        <p className="mt-1">
          ・強風や悪天候の場合は、装飾への組み換えになります。予備日を設定しておくことで延期も可能です。
        </p>
      </>
    )
  } else if (info.isHeliumGas) {
    heading = '届いたら・使い方'
    content = (
      <>
        <p><strong>届いたら：</strong></p>
        <p className="mt-1">
          ・直射日光や高温を避けて保管してください<br />
          ・お子さまの手の届かない場所に保管してください
        </p>
        <p className="mt-3"><strong>ガス補充の方法：</strong></p>
        <p className="mt-1">
          ・フィルムバルーンの注入口にノズルを差し込み、ゆっくり注入してください<br />
          ・入れすぎにご注意ください（バルーンが破裂する恐れがあります）
        </p>
        <p className="mt-3"><strong>安全にお使いいただくために：</strong></p>
        <p className="mt-1">
          ・ヘリウムガスを直接吸い込まないでください<br />
          ・ゴム（ラテックス）バルーンへの補充はできません<br />
          ・使い切った缶は各自治体の分別ルールに従って廃棄してください
        </p>
      </>
    )
  } else if (info.isOkigata) {
    heading = '届いたらそのまま飾れます'
    content = (
      <>
        <p>バルーンは専用の箱に入れてお届けします。ヘリウムガスは使用していないので、届いたらそのままテーブルに置いて飾れます。</p>
        <p className="mt-3"><strong>届いたら：</strong></p>
        <p className="mt-1">
          ・箱から取り出して、お好きな場所に置くだけでOKです<br />
          ・直射日光の当たらない場所に飾ると長持ちします
        </p>
        <p className="mt-3"><strong>配送について：</strong></p>
        <p className="mt-1">・日時指定ができます（ご注文時にご選択ください）</p>
      </>
    )
  } else {
    // デフォルト: ヘリウム浮遊型
    heading = 'お届けと保管について'
    content = (
      <>
        <p>バルーンは専用の箱に入れてお届けします。箱を開けると、ヘリウムガスでバルーンがふわっと浮かび上がります。</p>
        <p className="mt-3"><strong>届いたら：</strong></p>
        <p className="mt-1">
          ・開封前は温度変化の無い場所に静かにおいてください<br />
          ・開封後は、室内のできるだけ温度変化のない風の当たらない場所に設置すると長持ちします
        </p>
        <p className="mt-3"><strong>配送について：</strong></p>
        <p className="mt-1">
          ・日時指定ができます（ご注文時にご選択ください）<br />
          ・気温が極端に高い/低い日は、バルーンのコンディションに影響することがあります
        </p>
      </>
    )
  }

  return (
    <AccordionItem value="delivery">
      <AccordionTrigger className="text-sm font-semibold text-brand-dark">
        <span className="flex items-center gap-2">
          <Truck className="h-4 w-4 text-brand-teal" />
          {heading}
        </span>
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed text-foreground/70">
        {content}
      </AccordionContent>
    </AccordionItem>
  )
}

// ─── イベントへのお届けについて ───

function CautionAccordion({ info }: { info: ProductTypeInfo }) {
  // オプション・リリース・ヘリウムガスは非表示
  if (info.isOption || info.isRelease || info.isHeliumGas) return null

  return (
    <AccordionItem value="caution">
      <AccordionTrigger className="text-sm font-semibold text-brand-dark">
        <span className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-brand-teal" />
          イベントや結婚式へのお届けについて
        </span>
      </AccordionTrigger>
      <AccordionContent className="text-sm leading-relaxed text-foreground/70">
        <p>
          <strong>余裕を持ったオーダーをお願いいたします</strong><br />
          万が一、バルーンの破損などのトラブルがあった場合、再送などのフォローができるように余裕をもってオーダーしてください。
        </p>
        <p className="mt-3">
          <strong>バルーンの受け入れが可能かどうかご確認ください</strong><br />
          会場に届ける場合は、事前に会場のご担当者へ「バルーンを届けます」とご連絡をお願いいたします。
        </p>
        <p className="mt-3">
          <strong>イベントなどの会場で迷子にならないために</strong><br />
          結婚式やパーティーなどの場合は、イベント名・開始時刻・会場名をご注文時にお知らせください。外箱に大きく記載することで、お届け先での混乱を防ぎます。
        </p>
      </AccordionContent>
    </AccordionItem>
  )
}
