'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCartStore, type CartItemOption } from '@/lib/cart-store'
import { useCartDrawer } from '@/components/CartDrawer'
import { Check, ShoppingCart, Share2, ChevronLeft, ZoomIn } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { ProductInfoAccordion } from '@/components/product/ProductInfoAccordion'
import { OptionProductsSlider } from '@/components/product/OptionProductsSlider'
import { detectProductType, shouldShowHeliumBanner } from '@/lib/product-types'

type SelectOption = {
  name: string
  required: boolean
  choices: { label: string; additionalPrice?: number; id?: string }[]
}

type TextInput = {
  name: string
  required: boolean
  placeholder?: string
  price?: number
}

type ExtraOption = {
  name: string
  price: number
  description?: string
  imageUrl?: string | null
}

type ProductData = {
  id: string
  title: string
  slug: string
  sku?: string
  price: number
  productType: 'standard' | 'delivery'
  tags?: string[]
  bodyHtml?: string
  images: { url: string; alt: string }[]
  selectOptions: SelectOption[]
  extraOptions: ExtraOption[]
  textInputs: TextInput[]
}

export function ProductDetailClient({ product }: { product: ProductData }) {
  const addItem = useCartStore((s) => s.addItem)
  const openCartDrawer = useCartDrawer((s) => s.open)

  // Read back link from sessionStorage (set by ProductListClient)
  const [backHref, setBackHref] = useState('/products')
  useEffect(() => {
    const stored = sessionStorage.getItem('uballoon-products-url')
    if (stored) setBackHref(stored)
  }, [])

  // Image gallery state
  const [selectedImage, setSelectedImage] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  // Option selections
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [textValues, setTextValues] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)
  const [extrasChecked, setExtrasChecked] = useState<Record<string, boolean>>({})

  // Helium gas option eligibility (built-in extra)
  const heliumGasPrice = 900
  const showHeliumOption = useMemo(() => {
    const typeInfo = detectProductType(product.sku, product.tags || [])
    const { showRecommend, showPartial } = shouldShowHeliumBanner(product.sku, typeInfo)
    return showRecommend || showPartial
  }, [product.sku, product.tags])

  // Merge built-in helium gas option + DB extra options
  const allExtras: ExtraOption[] = useMemo(() => {
    const extras: ExtraOption[] = [...product.extraOptions]
    if (showHeliumOption) {
      extras.unshift({
        name: '補充用ヘリウムガス缶',
        price: heliumGasPrice,
        description: '届いたバルーンのヘリウムが少なくなった時に補充できます',
        imageUrl: 'https://uballoon-edge.urakutours.workers.dev/helium-gas-option.webp',
      })
    }
    return extras
  }, [product.extraOptions, showHeliumOption])

  // Calculate option total
  const optionTotal = useMemo(() => {
    let total = 0
    for (const opt of product.selectOptions) {
      const selected = selections[opt.name]
      if (selected) {
        const choice = opt.choices.find((c) => c.label === selected)
        if (choice?.additionalPrice) total += choice.additionalPrice
      }
    }
    for (const inp of product.textInputs) {
      if (textValues[inp.name]?.trim() && inp.price) {
        total += inp.price
      }
    }
    for (const ext of allExtras) {
      if (extrasChecked[ext.name]) total += ext.price
    }
    return total
  }, [selections, textValues, product.selectOptions, product.textInputs, extrasChecked, allExtras])

  const unitPrice = product.price + optionTotal

  const allRequiredFilled = useMemo(() => {
    for (const opt of product.selectOptions) {
      if (opt.required && !selections[opt.name]) return false
    }
    for (const inp of product.textInputs) {
      if (inp.required && !textValues[inp.name]?.trim()) return false
    }
    return true
  }, [selections, textValues, product.selectOptions, product.textInputs])

  const handleAddToCart = useCallback(() => {
    const options: CartItemOption = {}

    const sels = Object.entries(selections)
      .filter(([, v]) => v)
      .map(([name, value]) => {
        const opt = product.selectOptions.find((o) => o.name === name)
        const choice = opt?.choices.find((c) => c.label === value)
        return { name, value, additionalPrice: choice?.additionalPrice || 0 }
      })
    if (sels.length > 0) options.selections = sels

    const txts = Object.entries(textValues)
      .filter(([, v]) => v.trim())
      .map(([name, value]) => {
        const inp = product.textInputs.find((i) => i.name === name)
        return { name, value, price: inp?.price || 0 }
      })
    if (txts.length > 0) options.textValues = txts

    const checkedExtras = allExtras.filter((ext) => extrasChecked[ext.name])
    if (checkedExtras.length > 0) {
      options.extras = checkedExtras.map((ext) => ({ name: ext.name, price: ext.price }))
    }

    addItem({
      productId: product.id,
      productSlug: product.slug,
      title: product.title,
      price: product.price,
      productType: product.productType,
      imageUrl: product.images[0]?.url,
      quantity: 1,
      options,
      optionTotal,
      unitPrice,
    })

    setAdded(true)
    openCartDrawer()
    setTimeout(() => setAdded(false), 2000)
  }, [selections, textValues, product, optionTotal, unitPrice, addItem, openCartDrawer])

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: product.title,
        url: window.location.href,
      })
    } else {
      await navigator.clipboard.writeText(window.location.href)
    }
  }

  const hasOptions = product.selectOptions.length > 0 || product.textInputs.length > 0 || allExtras.length > 0

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-foreground/50 transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          商品一覧に戻る
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Image Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {/* Main image */}
          <div
            className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-xl bg-muted"
            onClick={() => setZoomOpen(true)}
          >
            {product.images.length > 0 ? (
              <Image
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].alt}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl sm:text-7xl">🎈</div>
            )}
            <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-foreground/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ZoomIn className="h-4 w-4" />
            </div>
          </div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all sm:h-20 sm:w-20 ${
                    i === selectedImage
                      ? 'border-brand-dark shadow-sm'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="80px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Options */}
        <div>
          {/* Badges */}
          <div className="mb-3 flex flex-wrap gap-1.5">
            <Badge
              className={
                product.productType === 'delivery'
                  ? 'border-0 bg-brand-pink text-white'
                  : 'border-brand-dark/20 bg-transparent text-brand-dark'
              }
            >
              {product.productType === 'delivery' ? 'デリバリー限定' : '通常商品'}
            </Badge>
            {product.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="border-border/60 text-xs text-foreground/60">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="mb-2 text-xl font-bold leading-tight text-brand-teal sm:text-2xl lg:text-3xl">
            {product.title}
          </h1>

          {/* Price */}
          <p className="mb-5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-brand-dark sm:text-3xl">
              ¥{product.price.toLocaleString()}
            </span>
            <span className="text-xs text-foreground/40">税込</span>
          </p>

          {/* Share button */}
          <div className="mb-5">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
            >
              <Share2 className="h-3.5 w-3.5" />
              シェア
            </button>
          </div>

          {/* Description */}
          {product.bodyHtml && (
            <div
              className="prose prose-sm mb-6 max-w-none text-foreground/70 prose-headings:text-brand-dark prose-a:text-brand-teal"
              dangerouslySetInnerHTML={{ __html: product.bodyHtml }}
            />
          )}

          {/* Product type accordion */}
          <div className="mb-6">
            <ProductInfoAccordion
              sku={product.sku}
              tags={product.tags || []}
              isFringeCustomize={product.sku === 'g-prf-0014' || product.sku === 'g-prf-0019'}
            />
          </div>

          {(hasOptions || showHeliumOption) && <Separator className="my-6" />}

          {/* Select Options */}
          {product.selectOptions.map((opt) => (
            <div key={opt.name} className="mb-5">
              <Label className="mb-2 block text-sm font-semibold text-brand-dark">
                {opt.name}
                {opt.required && <span className="ml-1 text-brand-pink">*</span>}
              </Label>
              <Select
                value={selections[opt.name] || ''}
                onValueChange={(v) =>
                  setSelections((prev) => ({ ...prev, [opt.name]: v || '' }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="選択してください..." />
                </SelectTrigger>
                <SelectContent>
                  {opt.choices.map((choice) => (
                    <SelectItem key={choice.label} value={choice.label}>
                      {choice.label}
                      {(choice.additionalPrice ?? 0) > 0 &&
                        ` (+¥${choice.additionalPrice!.toLocaleString()})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Text Inputs */}
          {product.textInputs.map((inp) => (
            <div key={inp.name} className="mb-5">
              <Label className="mb-2 block text-sm font-semibold text-brand-dark">
                {inp.name}
                {inp.required && <span className="ml-1 text-brand-pink">*</span>}
                {(inp.price ?? 0) > 0 && (
                  <span className="ml-2 text-xs font-normal text-foreground/40">
                    +¥{inp.price!.toLocaleString()}
                  </span>
                )}
              </Label>
              <Input
                placeholder={inp.placeholder || '入力してください...'}
                value={textValues[inp.name] || ''}
                onChange={(e) =>
                  setTextValues((prev) => ({ ...prev, [inp.name]: e.target.value }))
                }
                className="text-base sm:text-sm"
              />
            </div>
          ))}

          {/* Extra Options (checkbox items: helium gas, etc.) */}
          {allExtras.map((ext) => (
            <div key={ext.name} className="mb-3">
              <label
                className="group flex cursor-pointer items-center gap-4 rounded-xl border border-border/60 p-4 transition-all hover:border-brand-teal/30 hover:bg-muted/30 has-[:checked]:border-brand-teal/50 has-[:checked]:bg-brand-teal/5"
              >
                <input
                  type="checkbox"
                  checked={extrasChecked[ext.name] || false}
                  onChange={(e) =>
                    setExtrasChecked((prev) => ({ ...prev, [ext.name]: e.target.checked }))
                  }
                  className="h-4.5 w-4.5 accent-brand-teal"
                />
                {ext.imageUrl ? (
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={ext.imageUrl}
                      alt={ext.name}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    ＋
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-dark">{ext.name}</p>
                  {ext.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-foreground/50">
                      {ext.description}
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold text-brand-teal">+¥{ext.price.toLocaleString()}</span>
              </label>
            </div>
          ))}

          {hasOptions && <Separator className="mb-6" />}

          {/* Price Summary */}
          <div className="mb-6 rounded-xl border border-border/60 bg-muted/30 p-4 sm:p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground/60">基本価格</span>
              <span className="font-medium">¥{product.price.toLocaleString()}</span>
            </div>
            {optionTotal > 0 && (
              <div className="mt-1.5 flex items-center justify-between text-sm">
                <span className="text-foreground/60">オプション追加</span>
                <span className="font-medium text-brand-teal">+¥{optionTotal.toLocaleString()}</span>
              </div>
            )}
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-dark">合計</span>
              <span className="text-xl font-bold text-brand-dark sm:text-2xl">
                ¥{unitPrice.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Add to Cart */}
          <div className="hidden sm:block">
            <Button
              size="lg"
              className="w-full gap-2 bg-brand-dark text-sm font-semibold hover:bg-brand-dark/90 sm:text-base"
              onClick={handleAddToCart}
              disabled={added || !allRequiredFilled}
            >
              {added ? (
                <>
                  <Check className="h-4.5 w-4.5" />
                  カートに追加しました
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4.5 w-4.5" />
                  カートに追加
                </>
              )}
            </Button>
            {!allRequiredFilled && hasOptions && (
              <p className="mt-2 text-center text-xs text-foreground/40">
                必須オプション（*）を選択してください
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Option Products Slider */}
      <OptionProductsSlider currentProductId={product.id} />

      {/* Mobile sticky add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-white/95 p-3 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="flex-1">
            <span className="text-[10px] text-foreground/40">合計</span>
            <p className="text-lg font-bold leading-tight text-brand-dark">
              ¥{unitPrice.toLocaleString()}
            </p>
          </div>
          <Button
            size="lg"
            className="shrink-0 gap-2 bg-brand-dark px-6 font-semibold hover:bg-brand-dark/90"
            onClick={handleAddToCart}
            disabled={added || !allRequiredFilled}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                追加済み
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                カートに追加
              </>
            )}
          </Button>
        </div>
      </div>
      <div className="h-20 sm:hidden" />

      {/* Image Zoom Dialog */}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogTitle className="sr-only">{product.title} - 画像拡大</DialogTitle>
          {product.images.length > 0 && (
            <div className="relative aspect-square">
              <Image
                src={product.images[selectedImage].url}
                alt={product.images[selectedImage].alt}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
          )}
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-t px-4 py-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-all ${
                    i === selectedImage
                      ? 'border-brand-dark'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
