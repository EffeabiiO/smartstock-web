'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Le password non coincidono.'); return }
    if (password.length < 6) { toast.error('La password deve avere almeno 6 caratteri.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push('/onboarding')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="card p-8">
      <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">Crea account</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Inizia a gestire la tua attività</p>
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="label">Email</label>
          <input type="email" className="input" placeholder="nome@azienda.it" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input type="password" className="input" placeholder="Almeno 6 caratteri" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div>
          <label className="label">Conferma Password</label>
          <input type="password" className="input" placeholder="Ripeti la password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        </div>
        <button type="submit" className="btn-primary w-full py-2.5 mt-2" disabled={loading}>
          {loading ? 'Registrazione...' : 'Crea account'}
        </button>
      </form>
      <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
        Hai già un account?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Accedi</Link>
      </p>
    </div>
  )
}
