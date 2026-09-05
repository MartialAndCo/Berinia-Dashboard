'use server'

import { createClient } from '@supabase/supabase-js'

export async function setClientActiveAction(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  
  if (!supabaseUrl || !supabaseServiceKey) return { success: false }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  const { error } = await supabaseAdmin.from('clients').update({ status: 'Actif' }).eq('user_id', userId)
  
  if (error) return { success: false, error: error.message }
  return { success: true }
}
