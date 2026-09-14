import { NextRequest, NextResponse } from 'next/server'
import { checkUserAuth, isAdminUser } from '@/utils/supabase/server'
import { getServiceSupabase } from '@/lib/supabase'
import { updateSupportStatus, SupportStatus } from '@/lib/support-store'

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await checkUserAuth()
    const isUserAdmin = isAdminUser(user)
    const sbAdmin = getServiceSupabase()
    const { id } = await context.params
    const body = await request.json()
    const { status } = body

    if (!['pending', 'in_progress', 'resolved'].includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    let clientId: string | null = null
    if (!isUserAdmin) {
      const { data: client, error } = await sbAdmin
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (error || !client) {
        return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
      }
      clientId = client.id
    }

    const ok = await updateSupportStatus(id, status as SupportStatus, isUserAdmin ? null : clientId)
    if (!ok) {
      return NextResponse.json({ error: 'Échec de la mise à jour' }, { status: 404 })
    }

    return NextResponse.json({ success: true, status })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
