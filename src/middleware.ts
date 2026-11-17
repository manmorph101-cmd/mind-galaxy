import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// DEV MODE — no auth required
// Replace this with Clerk middleware when you have your Clerk keys
export function middleware(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
