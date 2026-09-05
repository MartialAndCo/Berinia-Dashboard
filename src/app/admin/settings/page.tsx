'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { KeyRound, Mail } from 'lucide-react'

export default function AdminSettingsPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setEmail(session.user.email || '')
    }
    setLoading(false)
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

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const newEmail = form.newEmail.value

    const toastId = toast.loading("Sending request...")
    // This sends a confirmation email to the new address and the old address
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Check your emails to confirm the change.", { id: toastId })
    }
  }

  if (loading) return <div className="p-8 text-[#73706b]">Loading account settings...</div>

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> ADMIN SETTINGS
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Account Settings</h1>
          <p className="text-sm text-[#73706b]">Manage your credentials and administrative security</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <form onSubmit={handleUpdateEmail}>
            <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-[#f0ece4]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> CREDENTIALS
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#9e4733]"/> Change Email
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">
                    A confirmation link will be sent to your new email address.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Current Email</Label>
                    <Input value={email} disabled className="bg-[#faf9f7] border-[#e2dfd8] text-[#73706b] rounded-sm h-10 text-sm font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">New Email</Label>
                    <Input name="newEmail" type="email" required placeholder="new@admin.com" className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                </CardContent>
              </div>
              <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                <Button type="submit" className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                  Send Confirmation Request <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                </Button>
              </CardFooter>
            </Card>
          </form>

          <form onSubmit={handleUpdatePassword}>
            <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] h-full flex flex-col justify-between">
              <div>
                <CardHeader className="pb-4 border-b border-[#f0ece4]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> AUTHENTICATION
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-[#9e4733]"/> Change Password
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">
                    Choose a new secure password for your administrator access.
                  </CardDescription>
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
              </div>
              <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                <Button type="submit" className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full">
                  Update Password <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
      </div>
    </div>
  )
}
