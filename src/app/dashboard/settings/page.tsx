'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Building2, KeyRound, Mail, ReceiptText } from 'lucide-react'

export default function ClientSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const [clientData, setClientData] = useState<any>(null)
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    fetchClient()
  }, [])

  const fetchClient = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    if (data) {
      setClientData(data)
      setCompanyName(data.company_name)
      setEmail(data.email || session.user.email || '')
    }
    setLoading(false)
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const toastId = toast.loading("Saving...")

    const { error } = await supabase
      .from('clients')
      .update({ company_name: companyName })
      .eq('id', clientData.id)

    if (error) {
      toast.error("Error updating company.", { id: toastId })
    } else {
      toast.success("Company updated successfully.", { id: toastId })
    }
    setSaving(false)
  }

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const newEmail = form.newEmail.value

    const toastId = toast.loading("Sending request...")
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Check your email to confirm the change.", { id: toastId })
      form.reset()
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const password = form.password.value
    const confirm = form.confirm.value

    if (password !== confirm) {
      return toast.error("Passwords do not match.")
    }

    const toastId = toast.loading("Updating...")
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Password updated successfully.", { id: toastId })
      form.reset()
    }
  }

  if (loading) {
    return (
      <div className="p-8 animate-pulse">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-3 w-28 bg-[#e6e2d6] rounded-sm" />
            <div className="h-8 w-64 bg-[#dfdbd2] rounded-sm" />
            <div className="h-4 w-96 bg-[#eae7df] rounded-sm" />
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Card 1: Company Profile */}
              <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-6 w-40 bg-[#dfdbd2] rounded-sm" />
                <div className="h-3 w-56 bg-[#eae7df] rounded-sm" />
                <div className="h-10 w-full bg-[#f6f4f0] rounded-sm mt-4" />
                <div className="h-10 w-full bg-[#e6e2d6] rounded-sm mt-2" />
              </div>
              {/* Card 2: Pricing Terms */}
              <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-6 w-40 bg-[#dfdbd2] rounded-sm" />
                <div className="h-3 w-56 bg-[#eae7df] rounded-sm" />
                <div className="h-16 w-full bg-[#f6f4f0] rounded-sm mt-4" />
              </div>
            </div>

            <div className="space-y-8">
              {/* Card 3: Credentials */}
              <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-6 w-40 bg-[#dfdbd2] rounded-sm" />
                <div className="h-3 w-56 bg-[#eae7df] rounded-sm" />
                <div className="h-10 w-full bg-[#f6f4f0] rounded-sm mt-4" />
                <div className="h-10 w-full bg-[#e6e2d6] rounded-sm mt-2" />
              </div>
              {/* Card 4: Password */}
              <div className="rounded-sm border border-[#e6e2d6] bg-[#ffffff] p-6 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="h-2.5 w-24 bg-[#e6e2d6] rounded-sm" />
                <div className="h-6 w-40 bg-[#dfdbd2] rounded-sm" />
                <div className="h-3 w-56 bg-[#eae7df] rounded-sm" />
                <div className="h-10 w-full bg-[#f6f4f0] rounded-sm mt-4" />
                <div className="h-10 w-full bg-[#f6f4f0] rounded-sm mt-2" />
                <div className="h-10 w-full bg-[#e6e2d6] rounded-sm mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> CLIENT SETTINGS
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Account & Plan Settings</h1>
          <p className="text-sm text-[#73706b]">Manage your company identity, login credentials, and review subscription terms</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <form onSubmit={handleSaveCompany}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> ORGANIZATION
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#9e4733]"/> Company Profile
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">Update your official company display name.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Company Name</Label>
                    <Input value={companyName} onChange={e => setCompanyName(e.target.value)} required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button type="submit" disabled={saving} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                    Save Changes <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> PRICING TERMS
                </div>
                <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-[#9e4733]"/> Your Plan
                </CardTitle>
                <CardDescription className="text-xs text-[#73706b]">Details of your current usage rate.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#73706b]">Rate per minute</span>
                  <span className="font-serif font-bold text-lg text-[#1a1918]">${clientData?.billing_rate_per_min} / min</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <form onSubmit={handleUpdateEmail}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> CREDENTIALS
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#9e4733]"/> Change Email
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">A confirmation link will be sent to your new address.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Current Email</Label>
                    <Input value={email} disabled className="bg-[#faf9f7] border-[#e2dfd8] text-[#73706b] rounded-sm h-10 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">New Email</Label>
                    <Input name="newEmail" type="email" required placeholder="new@example.com" className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button variant="outline" type="submit" className="border-[#e6e2d6] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                    Send Confirmation Request
                  </Button>
                </CardFooter>
              </Card>
            </form>

            <form onSubmit={handleUpdatePassword}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> AUTHENTICATION
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#9e4733]"/> Security
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">Change your client portal password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">New Password</Label>
                    <Input name="password" type="password" required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Confirm Password</Label>
                    <Input name="confirm" type="password" required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button variant="outline" type="submit" className="border-[#e6e2d6] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                    Update Password
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}
