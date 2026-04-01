'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { LogOut, User as UserIcon, Shield, Mail, Calendar } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function AccountPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [changingPw, setChangingPw] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 6) { toast.error('La password deve avere almeno 6 caratteri'); return }
    setChangingPw(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { toast.error('Errore durante il cambio password'); }
    else { toast.success('Password aggiornata con successo'); setNewPassword('') }
    setChangingPw(false)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="page-title">Account</h1>
        <p className="text-muted mt-1">Le tue informazioni personali</p>
      </div>

      {/* User info */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center">
            <UserIcon size={28} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-slate-100">{user?.email}</p>
            <p className="text-sm text-slate-400">Utente registrato</p>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Mail size={15} className="flex-shrink-0 text-slate-400" />
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Calendar size={15} className="flex-shrink-0 text-slate-400" />
            <span>Account creato il {formatDate(user?.created_at ?? null)}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Shield size={15} className="flex-shrink-0 text-slate-400" />
            <span>ID: {user?.id?.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Cambia Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="label">Nuova Password</label>
            <input
              type="password"
              className="input"
              placeholder="Almeno 6 caratteri"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={changingPw}>
            {changingPw ? 'Aggiornamento...' : 'Aggiorna Password'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div className="card p-6">
        <h2 className="section-title mb-2">Sessione</h2>
        <p className="text-muted text-sm mb-4">Disconnettiti da questo dispositivo</p>
        <button onClick={handleLogout} className="btn-danger flex items-center gap-2">
          <LogOut size={16} /> Disconnetti
        </button>
      </div>
    </div>
  )
}
