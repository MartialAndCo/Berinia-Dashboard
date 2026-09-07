import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
    }
  )
}

export function isAdminUser(user: { email?: string | null; app_metadata?: Record<string, any>; user_metadata?: Record<string, any> } | null): boolean {
  if (!user) return false
  if (user.email?.toLowerCase() === 'admin@berinia.com') return true
  if (user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin') return true
  return false
}

export async function checkAdminAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminUser(user)) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function checkUserAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

