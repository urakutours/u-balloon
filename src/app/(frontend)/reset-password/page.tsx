import { Suspense } from 'react'
import ResetPasswordContent from './ResetPasswordContent'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
          読み込み中...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
