import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Suspense fallback={<div className="text-white/40 text-xs">Loading authentication...</div>}>
        <SignIn />
      </Suspense>
    </div>
  )
}
