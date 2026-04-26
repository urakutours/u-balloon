import { Suspense } from 'react'
import ForgotPasswordContent from './ForgotPasswordContent'

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">
          読み込み中...
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}
