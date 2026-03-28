import { Suspense } from 'react'
import LoginContent from './LoginContent'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center px-4">読み込み中...</div>}>
      <LoginContent />
    </Suspense>
  )
}
