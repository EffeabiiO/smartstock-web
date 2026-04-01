'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Order } from '@/types'
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel, cn } from '@/lib/utils'
import { Plus, ShoppingCart, ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'

const STATUS_FILTERS = ['tutti', 'bozza', 'confermato', 'in_produzione', 'completato', 'annullato']

export default function OrdiniPage() {
  const { activeCompany } = useCompany()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('tutti')

  useEffect(() => {
    if (!activeCompany) return
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false })
      setOrders(data ?? [])
      setLoading(false)
    }
    fetch()
  }, [activeCompany])

  const filtered = orders.filter(o => {
    const matchSearch = (o.customer_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'tutti' || o.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Ordini</h1>
          <p className="text-muted mt-1">{orders.length} ordini totali</p>
        </div>
        <Link href="/ordini/nuovo" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuovo Ordine</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-10" placeholder="Cerca cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              )}
            >
              {s === 'tutti' ? 'Tutti' : getOrderStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingCart size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Nessun ordine trovato</p>
          <Link href="/ordini/nuovo" className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={16} />Crea Ordine</Link>
        </div>
      ) : (
        <>
          {/* Desktop */}
          <div className="card hidden lg:block overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stato</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fatturato</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Margine</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{o.customer_name ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{formatDate(o.created_at)}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`status-badge ${getOrderStatusColor(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right text-sm font-medium text-slate-900 dark:text-slate-100">{formatCurrency(o.total_revenue)}</td>
                    <td className="px-4 py-3.5 text-right text-sm text-green-700">{formatCurrency(o.total_margin)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/ordini/${o.id}`} className="text-blue-600 hover:text-blue-700"><ChevronRight size={16} /></Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="lg:hidden space-y-2">
            {filtered.map(o => (
              <Link key={o.id} href={`/ordini/${o.id}`} className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={18} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{o.customer_name ?? 'Nessun cliente'}</p>
                  <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`status-badge ${getOrderStatusColor(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
                  <p className="text-xs text-slate-500 mt-1">{formatCurrency(o.total_revenue)}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
