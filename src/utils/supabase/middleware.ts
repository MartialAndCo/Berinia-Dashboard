import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip middleware for APIs, static assets, images, etc.
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data?.user || null
  } catch (err) {
    console.error('Middleware getUser error:', err)
  }

  const redirectWithCookies = (targetPath: string) => {
    const url = request.nextUrl.clone()
    url.pathname = targetPath
    const res = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie)
    })
    return res
  }

  const isUserAdmin = user && (user.email?.toLowerCase() === 'admin@berinia.com' || user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin')

  // Protect Admin routes
  if (pathname.startsWith('/admin')) {
    if (!isUserAdmin) {
      return redirectWithCookies('/login')
    }
  }

  // Protect Client Dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      return redirectWithCookies('/login')
    }
  }

  // Root route
  if (pathname === '/') {
    if (user) {
      return redirectWithCookies(isUserAdmin ? '/admin' : '/dashboard')
    }
    return supabaseResponse
  }

  return supabaseResponse
}

