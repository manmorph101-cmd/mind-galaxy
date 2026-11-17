import { SignUp } from '@clerk/nextjs'
import { Suspense } from 'react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Suspense fallback={<div className="text-white/40 text-xs">Loading authentication...</div>}>
        <SignUp />
      </Suspense>
    </div>
  )
}
