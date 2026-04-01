'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { CompanyProvider, useCompany } from '@/hooks/useCompany'
import {
  LayoutDashboard, Package, ShoppingCart, Factory,
  BarChart3, Settings, User, LogOut, ChevronDown,
  Building2, Plus, Menu, X, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Company } from '@/types'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventario', label: 'Inventario', icon: Package },
  { href: '/ordini', label: 'Ordini', icon: ShoppingCart },
  { href: '/produzione', label: 'Produzione', icon: Factory },
  { href: '/insights', label: 'Insights', icon: TrendingUp },
  { href: '/impostazioni', label: 'Impostazioni', icon: Settings },
]

function CompanySwitcher() {
  const { companies, activeCompany, setActiveCompany, loading } = useCompany()
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleCreate = async () => {
    const name = prompt('Nome nuova azienda:')
    if (!name?.trim()) return
    const { data, error } = await supabase.rpc('create_company_with_membership', { company_name: name.trim() })
    if (error) { toast.error('Errore durante la creazione'); return }
    localStorage.setItem('activeCompanyId', data as string)
    toast.success('Azienda creata!')
    window.location.reload()
  }

  if (loading || !activeCompany) return (
    <div className="h-10 bg-slate-100 dark:bg-gray-800 rounded-xl animate-pulse" />
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {activeCompany.logo_url
            ? <img src={activeCompany.logo_url} alt={activeCompany.name} className="w-full h-full object-cover" />
            : <Building2 size={16} color="white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{activeCompany.name}</p>
          <p className="text-xs text-slate-400">Azienda attiva</p>
        </div>
        <ChevronDown size={14} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-xl shadow-lg z-50 overflow-hidden">
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => { setActiveCompany(c); setOpen(false); router.refresh() }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-left',
                c.id === activeCompany.id && 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950'
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center overflow-hidden">
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-full h-full object-cover" /> : <Building2 size={14} color="white" />}
              </div>
              <span className="font-medium truncate">{c.name}</span>
            </button>
          ))}
          <div className="border-t border-slate-100 dark:border-gray-800 mt-1">
            <button onClick={handleCreate} className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
              <Plus size={14} />
              <span>Nuova azienda</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Sidebar({ pathname }: { pathname: string }) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white dark:bg-gray-900 border-r border-slate-100 dark:border-gray-800 p-4">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 py-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <span className="font-bold text-slate-900 dark:text-slate-100">Gestionale</span>
      </div>

      {/* Company switcher */}
      <div className="mb-4">
        <CompanySwitcher />
      </div>

      <div className="h-px bg-slate-100 dark:bg-gray-800 mb-4" />

      {/* Nav */}
      <nav className="flex-1 space-y-0.5">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={active ? 'sidebar-item-active' : 'sidebar-item'}>
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="h-px bg-slate-100 dark:bg-gray-800 my-4" />

      {/* Bottom actions */}
      <div className="space-y-0.5">
        <Link href="/account" className={pathname.startsWith('/account') ? 'sidebar-item-active' : 'sidebar-item'}>
          <User size={18} />
          <span>Account</span>
        </Link>
        <button onClick={handleLogout} className="sidebar-item w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
          <LogOut size={18} />
          <span>Esci</span>
        </button>
      </div>
    </aside>
  )
}

function BottomNav({ pathname }: { pathname: string }) {
  const mobileItems = navItems.slice(0, 5)
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 px-2 py-1 z-40 safe-area-bottom">
      <div className="flex items-center justify-around">
        {mobileItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link key={item.href} href={item.href} className={active ? 'nav-item-active' : 'nav-item'}>
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function MobileHeader() {
  const { activeCompany } = useCompany()
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const pathname = usePathname()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{activeCompany?.name ?? 'Gestionale'}</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-20 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div className="absolute top-0 right-0 bottom-0 w-64 bg-white dark:bg-gray-900 p-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 mt-2">
              <CompanySwitcher />
            </div>
            <div className="h-px bg-slate-100 dark:bg-gray-800 mb-4" />
            <nav className="space-y-0.5">
              {navItems.map(item => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href} className={active ? 'sidebar-item-active' : 'sidebar-item'} onClick={() => setMenuOpen(false)}>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="h-px bg-slate-100 dark:bg-gray-800 my-4" />
            <Link href="/account" className="sidebar-item" onClick={() => setMenuOpen(false)}>
              <User size={18} /><span>Account</span>
            </Link>
            <button onClick={handleLogout} className="sidebar-item w-full text-red-500 hover:text-red-600 hover:bg-red-50">
              <LogOut size={18} /><span>Esci</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function ProtectedInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { activeCompany, loading } = useCompany()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !activeCompany) {
      router.push('/onboarding')
    }
  }, [loading, activeCompany, router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!activeCompany) return null

  return (
    <div className="flex min-h-screen">
      <Sidebar pathname={pathname} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav pathname={pathname} />
    </div>
  )
}

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyProvider>
      <ProtectedInner>{children}</ProtectedInner>
    </CompanyProvider>
  )
}
