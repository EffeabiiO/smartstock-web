'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Building2, Upload, Sun, Moon, Monitor, Save, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

type Theme = 'light' | 'dark' | 'system'

function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system')

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme) ?? 'system'
    setThemeState(saved)
    applyTheme(saved)
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    if (t === 'dark') root.classList.add('dark')
    else if (t === 'light') root.classList.remove('dark')
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
    }
  }

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return { theme, setTheme }
}

export default function ImpostazioniPage() {
  const { activeCompany, companies, setActiveCompany, refresh } = useCompany()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

  const [name, setName] = useState(activeCompany?.name ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(activeCompany?.logo_url ?? null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(activeCompany?.name ?? '')
    setLogoPreview(activeCompany?.logo_url ?? null)
  }, [activeCompany])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim() || !activeCompany) return
    setSaving(true)
    let logoUrl = activeCompany.logo_url

    if (logoFile) {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = logoFile.name.split('.').pop()
      const path = `logos/${user!.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('company-assets').upload(path, logoFile, { upsert: true })
      if (!error) {
        const { data } = supabase.storage.from('company-assets').getPublicUrl(path)
        logoUrl = data.publicUrl
      }
    }

    const { error } = await supabase.from('companies').update({ name: name.trim(), logo_url: logoUrl }).eq('id', activeCompany.id)
    if (error) { toast.error('Errore durante il salvataggio'); setSaving(false); return }

    await supabase.from('audit_logs').insert({
      company_id: activeCompany.id,
      action: 'company_updated',
      payload: { name: name.trim() },
    })

    toast.success('Impostazioni salvate')
    await refresh()
    setSaving(false)
  }

  const handleNewCompany = async () => {
    const newName = prompt('Nome nuova azienda:')
    if (!newName?.trim()) return
    const { data, error } = await supabase.rpc('create_company_with_membership', { company_name: newName.trim() })
    if (error) { toast.error('Errore durante la creazione'); return }
    localStorage.setItem('activeCompanyId', data as string)
    toast.success('Azienda creata!')
    await refresh()
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="page-title">Impostazioni</h1>
        <p className="text-muted mt-1">Gestisci la tua azienda e le preferenze</p>
      </div>

      {/* Company settings */}
      <div className="card p-6 space-y-5">
        <h2 className="section-title">Azienda Attiva</h2>

        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors overflow-hidden bg-slate-50 dark:bg-gray-800"
            onClick={() => document.getElementById('settings-logo')?.click()}
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              : <Building2 size={24} className="text-slate-300" />
            }
          </div>
          <input id="settings-logo" type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <div>
            <p className="font-medium text-sm text-slate-900 dark:text-slate-100">Logo Aziendale</p>
            <button className="text-sm text-blue-600 hover:text-blue-700" onClick={() => document.getElementById('settings-logo')?.click()}>
              {logoPreview ? 'Cambia logo' : 'Carica logo'}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Nome Azienda</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome azienda" />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save size={15} /> {saving ? 'Salvataggio...' : 'Salva Modifiche'}
        </button>
      </div>

      {/* Company switcher */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Le Tue Aziende</h2>
          <button onClick={handleNewCompany} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus size={13} /> Nuova
          </button>
        </div>
        <div className="space-y-2">
          {companies.map(c => (
            <div
              key={c.id}
              onClick={() => setActiveCompany(c)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${c.id === activeCompany?.id ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' : 'hover:bg-slate-50 dark:hover:bg-gray-800 border border-transparent'}`}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden">
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" /> : <Building2 size={16} color="white" />}
              </div>
              <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{c.name}</span>
              {c.id === activeCompany?.id && <span className="ml-auto text-xs text-blue-600 font-medium">Attiva</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="card p-6">
        <h2 className="section-title mb-4">Tema Interfaccia</h2>
        <div className="grid grid-cols-3 gap-3">
          {([
            { value: 'light', label: 'Chiaro', Icon: Sun },
            { value: 'dark', label: 'Scuro', Icon: Moon },
            { value: 'system', label: 'Sistema', Icon: Monitor },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === value ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'border-slate-100 dark:border-gray-800 text-slate-600 dark:text-slate-400 hover:border-slate-200'}`}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
