import { Suspense } from 'react'
import ChangePasswordContent from './ChangePasswordContent'

export const dynamic = 'force-dynamic'

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">読み込み中...</div>}>
      <ChangePasswordContent />
    </Suspense>
  )
}
