'use client'

import type { Database } from '@/types/index'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Building2, Upload, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { toast.error('Inserisci il nome dell\'azienda'); return }
    setLoading(true)
    try {
      let logoUrl: string | null = null

      if (logoFile) {
        const { data: { user } } = await supabase.auth.getUser()
        const ext = logoFile.name.split('.').pop()
        const path = `logos/${user!.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('company-assets')
          .upload(path, logoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('company-assets').getPublicUrl(path)
          logoUrl = urlData.publicUrl
        }
      }

      const { data, error } = await supabase.rpc(
  'create_company_with_membership' as 'create_company_with_membership',
  {
    company_name: name.trim(),
    company_logo_url: logoUrl,
  } as Database['public']['Functions']['create_company_with_membership']['Args']
)

      if (error) throw error
      localStorage.setItem('activeCompanyId', data as string)
      toast.success('Azienda creata con successo!')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Errore durante la creazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-4 shadow-lg">
            <Building2 size={24} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Configura la tua azienda</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Inserisci i dati per iniziare</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Logo upload */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden bg-slate-50 dark:bg-gray-800"
                onClick={() => document.getElementById('logo-input')?.click()}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                  : <Upload size={24} className="text-slate-400" />
                }
              </div>
              <input id="logo-input" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium" onClick={() => document.getElementById('logo-input')?.click()}>
                {logoPreview ? 'Cambia logo' : 'Carica logo (opzionale)'}
              </button>
            </div>

            <div>
              <label className="label">Nome Azienda *</label>
              <input
                type="text"
                className="input"
                placeholder="Es. La Mia Srl"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <button type="submit" className="btn-primary w-full py-3 flex items-center justify-center gap-2" disabled={loading}>
              {loading ? 'Creazione in corso...' : (<>Inizia <ArrowRight size={16} /></>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
