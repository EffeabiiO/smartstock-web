'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Company } from '@/types'

interface CompanyContextType {
  companies: Company[]
  activeCompany: Company | null
  setActiveCompany: (company: Company) => void
  loading: boolean
  refresh: () => Promise<void>
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchCompanies = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setCompanies(data)

      // Restore active company from localStorage or pick first
      const savedId = localStorage.getItem('activeCompanyId')
      const saved = data.find(c => c.id === savedId)
      setActiveCompanyState(saved ?? data[0] ?? null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company)
    localStorage.setItem('activeCompanyId', company.id)
  }

  return (
    <CompanyContext.Provider
      value={{ companies, activeCompany, setActiveCompany, loading, refresh: fetchCompanies }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompany() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompany must be used within CompanyProvider')
  return ctx
}
