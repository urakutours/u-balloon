import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import OrderCompleteContent from './OrderCompleteContent'

export const dynamic = 'force-dynamic'

export default function OrderCompletePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <OrderCompleteContent />
    </Suspense>
  )
}
