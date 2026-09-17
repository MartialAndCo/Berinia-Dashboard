'use server'

import { createClient, isAdminUser } from '@/utils/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { headers } from 'next/headers'

export interface LoginActionResult {
  success: boolean
  error?: string
  redirectUrl?: string
}

export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const email = (formData.get('email') as string || '').trim().toLowerCase()
  const password = formData.get('password') as string || ''
  const nextParam = formData.get('next') as string || ''

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' }
  }

  // 1. IP / Email Rate Limiting (10 attempts per 5 minutes)
  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0].trim() || headerList.get('x-real-ip') || '127.0.0.1'
  
  const limitCheck = rateLimit({
    key: `login:${ip}:${email}`,
    limit: 10,
    windowMs: 5 * 60 * 1000,
  })

  if (!limitCheck.success) {
    return {
      success: false,
      error: 'Too many failed login attempts. Please wait a few minutes before trying again.',
    }
  }

  try {
    const supabase = await createClient()

    // 2. Perform authentication securely on the server
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data?.session?.user) {
      return {
        success: false,
        error: error?.message || 'Invalid credentials. Please verify your email and password.',
      }
    }

    const user = data.session.user

    // 3. Validate nextUrl (prevent open redirect attacks)
    let redirectUrl = ''
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      redirectUrl = nextParam
    }

    // 4. Determine destination securely on the server
    if (!redirectUrl) {
      if (isAdminUser(user)) {
        redirectUrl = '/admin'
      } else {
        const { data: clientData } = await supabase
          .from('clients')
          .select('id, status')
          .eq('user_id', user.id)
          .maybeSingle()

        if (clientData) {
          const isInitialValidated = Boolean(
            user.user_metadata?.initial_validation_completed || 
            user.user_metadata?.onboarding_completed
          )
          if (!isInitialValidated && clientData.status !== 'Active') {
            redirectUrl = '/onboarding'
          } else {
            redirectUrl = '/dashboard'
          }
        } else {
          redirectUrl = '/admin'
        }
      }
    }

    return {
      success: true,
      redirectUrl,
    }
  } catch (err: any) {
    console.error('Server-side login action error:', err)
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred during sign in.',
    }
  }
}
