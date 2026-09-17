'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Building2, KeyRound, Mail, ReceiptText, Bell, Shield, Users, UserPlus, User } from 'lucide-react'
import { 
  updateClientCompanyAction, 
  updateNotificationPreferencesAction, 
  getTeamMembersAction, 
  inviteTeamMemberAction 
} from '../actions'
import PageLoading from '@/components/PageLoading'

export default function ClientSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [savingCompany, setSavingCompany] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [invitingMember, setInvitingMember] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminClientId, setAdminClientId] = useState<string | null>(null)
  
  const [clientData, setClientData] = useState<any>(null)
  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  // Notifications & Privacy state
  const [negativeSentimentAlert, setNegativeSentimentAlert] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [usageAlerts, setUsageAlerts] = useState(true)
  const [maskPhones, setMaskPhones] = useState(false)

  // Team state
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')

  useEffect(() => {
    fetchClient()
  }, [])

  const fetchClient = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const user = session.user
    const isUserAdmin = user.email?.toLowerCase() === 'admin@berinia.com' ||
      user.email?.toLowerCase() === 'yannrosemark@gmail.com' ||
      user.app_metadata?.role === 'admin'

    if (isUserAdmin) {
      setIsAdmin(true)
      if (typeof window !== 'undefined') {
        const cId = sessionStorage.getItem('admin_selected_client_id')
        setAdminClientId(cId)
      }
      setLoading(false)
      return
    }

    const meta = session.user.user_metadata || {}
    setFullName(meta.full_name || meta.name || '')

    // Parallelize client query and team members query
    const [clientRes, teamRes] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', session.user.id).single(),
      getTeamMembersAction()
    ])

    const data = clientRes.data
    if (data) {
      setClientData(data)
      setCompanyName(data.company_name)
      setEmail(data.email || session.user.email || '')
      
      const prefs = data.notification_preferences || {}
      setNegativeSentimentAlert(prefs.negative_sentiment ?? true)
      setWeeklyDigest(prefs.weekly_digest ?? false)
      setUsageAlerts(prefs.usage_alerts ?? true)
      setMaskPhones(data.privacy_mask_phones ?? false)
    }

    if (teamRes?.success) {
      setTeamMembers(teamRes.members || [])
    }
    setLoading(false)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fullName.trim()) return toast.error("Please enter your name.")
    setSavingUser(true)
    const toastId = toast.loading("Saving your profile name...")

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        name: fullName.trim()
      }
    })

    setSavingUser(false)
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Profile name updated successfully.", { id: toastId })
    }
  }

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingCompany(true)
    const toastId = toast.loading("Saving company profile...")

    const res = await updateClientCompanyAction(companyName)
    if (res.success) {
      toast.success("Company profile updated successfully.", { id: toastId })
    } else {
      toast.error("Error updating company: " + (res.error || 'Unknown error'), { id: toastId })
    }
    setSavingCompany(false)
  }

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPrefs(true)
    const toastId = toast.loading("Saving preferences...")

    const res = await updateNotificationPreferencesAction(
      {
        negative_sentiment: negativeSentimentAlert,
        weekly_digest: weeklyDigest,
        usage_alerts: usageAlerts,
      },
      maskPhones
    )

    if (res.success) {
      toast.success("Notification & privacy preferences saved.", { id: toastId })
    } else {
      toast.error("Error saving preferences: " + (res.error || 'Unknown error'), { id: toastId })
    }
    setSavingPrefs(false)
  }

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail) return
    setInvitingMember(true)
    const toastId = toast.loading("Adding team member...")

    const res = await inviteTeamMemberAction(newMemberEmail, newMemberRole)
    if (res.success) {
      toast.success("Team member invitation created.", { id: toastId })
      setNewMemberEmail('')
      const teamRes = await getTeamMembersAction()
      if (teamRes.success) setTeamMembers(teamRes.members || [])
    } else {
      toast.error("Error adding member: " + (res.error || 'Unknown error'), { id: toastId })
    }
    setInvitingMember(false)
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

    const toastId = toast.loading("Updating password...")
    const { error } = await supabase.auth.updateUser({ password })
    
    if (error) {
      toast.error(error.message, { id: toastId })
    } else {
      toast.success("Password updated successfully.", { id: toastId })
      form.reset()
    }
  }

  if (loading) {
    return <PageLoading message="Loading Settings..." />
  }

  if (isAdmin) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <CardHeader className="border-b border-[#e6e2d6] py-5 px-6 bg-[#faf8f5]">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
                <span>•</span> ADMIN VIEW MODE
              </div>
              <CardTitle className="font-serif text-2xl font-bold text-[#1a1918]">
                Client Portal Settings Restricted
              </CardTitle>
              <CardDescription className="text-xs text-[#73706b]">
                Client private credentials (passwords, emails) are restricted when viewing as Admin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4 text-sm text-[#73706b] leading-relaxed">
              <p>
                In Switch Account mode, you can inspect call histories, stats, recordings, and usage costs. To manage this client&apos;s credentials, voice agent mappings, or billing rates, please use the Admin Console.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                {adminClientId ? (
                  <a href={`/admin/client/${adminClientId}`}>
                    <Button className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 cursor-pointer shadow-none">
                      Manage Client in Admin Console <span className="ml-1 text-[#9e4733]">•</span>
                    </Button>
                  </a>
                ) : (
                  <a href="/admin">
                    <Button className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 cursor-pointer shadow-none">
                      Go to Admin Console <span className="ml-1 text-[#9e4733]">•</span>
                    </Button>
                  </a>
                )}
                <a href={adminClientId ? `/dashboard?clientId=${adminClientId}` : '/dashboard'}>
                  <Button variant="outline" className="border-[#e6e2d6] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 cursor-pointer shadow-none">
                    Back to Call Intelligence
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-1">
            <span>•</span> CLIENT SETTINGS
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#1a1918]">Account & Plan Settings</h1>
          <p className="text-sm text-[#73706b]">
            Manage your company identity, notification alerts, team access, and login credentials
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Column 1: Organization & Notifications */}
          <div className="space-y-8">
            {/* Personal User Profile */}
            <form onSubmit={handleSaveUser}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> PERSONAL PROFILE
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <User className="w-5 h-5 text-[#9e4733]"/> Your Name
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">Set your display name used in support conversations and communications.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Full Name</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Alex Dupont" required className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-10 text-sm" />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button type="submit" disabled={savingUser} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full cursor-pointer">
                    {savingUser ? 'Saving...' : 'Save Name'} <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Organization Profile */}
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
                  <Button type="submit" disabled={savingCompany} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full cursor-pointer">
                    {savingCompany ? 'Saving...' : 'Save Changes'} <span className="ml-1 text-[#9e4733] text-[16px] leading-none">•</span>
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Notification & Privacy Preferences */}
            <form onSubmit={handleSavePreferences}>
              <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                    <span>•</span> NOTIFICATIONS & PRIVACY
                  </div>
                  <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[#9e4733]"/> Alerts & Compliance
                  </CardTitle>
                  <CardDescription className="text-xs text-[#73706b]">Configure email triggers and privacy masking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6 divide-y divide-[#f0ece4]">
                  <div className="flex items-center justify-between py-2">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium text-[#1a1918]">Negative Sentiment Alerts</div>
                      <div className="text-xs text-[#73706b]">Send an immediate email alert when a caller expresses dissatisfaction.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={negativeSentimentAlert} 
                      onChange={e => setNegativeSentimentAlert(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#9e4733] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium text-[#1a1918]">Weekly Performance Digest</div>
                      <div className="text-xs text-[#73706b]">Receive a summary of call volume, resolution rates, and minutes.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={weeklyDigest} 
                      onChange={e => setWeeklyDigest(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#9e4733] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium text-[#1a1918]">Usage & Budget Warnings</div>
                      <div className="text-xs text-[#73706b]">Alert me when monthly usage minutes exceed expected volume.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={usageAlerts} 
                      onChange={e => setUsageAlerts(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#9e4733] cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="space-y-0.5 pr-4">
                      <div className="text-sm font-medium text-[#1a1918]">Mask Caller Phone Numbers</div>
                      <div className="text-xs text-[#73706b]">Mask caller phone numbers (e.g. +1 (***) ***-1234) for privacy.</div>
                    </div>
                    <input 
                      type="checkbox" 
                      checked={maskPhones} 
                      onChange={e => setMaskPhones(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#9e4733] cursor-pointer"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-[#f0ece4] bg-[#faf9f7]/30">
                  <Button type="submit" disabled={savingPrefs} className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full cursor-pointer">
                    {savingPrefs ? 'Saving...' : 'Save Notification Preferences'}
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Pricing Terms */}
            <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> PRICING TERMS
                </div>
                <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-[#9e4733]"/> Your Plan Rates
                </CardTitle>
                <CardDescription className="text-xs text-[#73706b]">Agreed contract rates for voice AI minutes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#73706b]">Rate per minute</span>
                  <span className="font-serif font-bold text-lg text-[#1a1918]">${clientData?.billing_rate_per_min} / min</span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-[#f0ece4]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#73706b]">Monthly Subscription</span>
                  <span className="font-serif font-bold text-lg text-[#1a1918]">${clientData?.monthly_retainer} / mo</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Team Members & Security Credentials */}
          <div className="space-y-8">
            {/* Team Access */}
            <Card className="border border-[#e6e2d6] bg-[#ffffff] rounded-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <CardHeader className="border-b border-[#e6e2d6] py-4 px-6 bg-[#faf8f5]">
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-[#9e4733] uppercase mb-0.5">
                  <span>•</span> TEAM COLLABORATION
                </div>
                <CardTitle className="font-serif text-xl font-bold text-[#1a1918] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#9e4733]"/> Team Members
                </CardTitle>
                <CardDescription className="text-xs text-[#73706b]">Colleagues with access to this client portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  {teamMembers.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#faf8f5] border border-[#e6e2d6] rounded-sm text-xs">
                      <div>
                        <div className="font-medium text-[#1a1918]">{m.email}</div>
                        <div className="text-[10px] text-[#73706b] uppercase tracking-wider">
                          Role: {m.role || 'Member'}
                        </div>
                      </div>
                      <Badge className="bg-[#eef7ee] text-[#2e6930] border border-[#d2ead2] rounded-sm text-[10px] uppercase font-semibold">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleInviteMember} className="pt-3 border-t border-[#f0ece4] space-y-2">
                  <Label className="text-[11px] font-semibold tracking-wider text-[#66635e] uppercase">Invite Team Member</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="email" 
                      placeholder="colleague@company.com" 
                      value={newMemberEmail} 
                      onChange={e => setNewMemberEmail(e.target.value)}
                      className="border-[#e2dfd8] bg-[#faf9f7]/50 rounded-sm h-9 text-xs"
                      required
                    />
                    <select
                      value={newMemberRole}
                      onChange={e => setNewMemberRole(e.target.value)}
                      className="h-9 px-2 text-xs border border-[#e2dfd8] bg-white rounded-sm"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                    </select>
                    <Button 
                      type="submit" 
                      disabled={invitingMember}
                      className="bg-[#1a1918] hover:bg-[#2d2d2d] text-[#f6f4f0] rounded-sm text-xs font-semibold uppercase tracking-wider h-9 px-3 shrink-0 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Email Change */}
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
                  <Button variant="outline" type="submit" className="border-[#e6e2d6] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full cursor-pointer">
                    Send Confirmation Request
                  </Button>
                </CardFooter>
              </Card>
            </form>

            {/* Password Change */}
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
                  <Button variant="outline" type="submit" className="border-[#e6e2d6] bg-white hover:bg-[#f6f4f0] text-[#1a1918] rounded-sm text-xs font-semibold tracking-wider uppercase h-10 px-5 w-full cursor-pointer">
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
