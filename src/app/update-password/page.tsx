'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if we have a valid session (Supabase automatically handles the hash in URL on redirect)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Not logged in via invite link, redirect to login
        router.push('/login')
      } else {
        setSessionChecked(true)
      }
    })
  }, [router])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Success, redirect to dashboard
    router.push('/dashboard')
  }

  if (!sessionChecked) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold tracking-tight text-center">
            Bienvenue !
          </CardTitle>
          <CardDescription className="text-center">
            Veuillez définir votre mot de passe pour finaliser votre inscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                minLength={6}
              />
            </div>
            {error && <div className="text-sm text-destructive font-medium">{error}</div>}
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Enregistrement...' : 'Enregistrer et continuer'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
