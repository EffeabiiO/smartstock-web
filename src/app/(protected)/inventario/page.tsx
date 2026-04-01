'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Product } from '@/types'
import { formatCurrency, getStockStatus, getStockStatusColor, getStockStatusLabel, cn } from '@/lib/utils'
import { Plus, Search, Package, ChevronRight, Filter } from 'lucide-react'
import Link from 'next/link'
import ProductFormModal from '@/components/forms/ProductFormModal'

const CATEGORIES = ['Tutti', 'Prodotto Finito', 'Componente', 'Materia Prima', 'Semilavorato']

export default function InventarioPage() {
  const { activeCompany } = useCompany()
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Tutti')
  const [stockFilter, setStockFilter] = useState<'tutti' | 'ok' | 'low' | 'out'>('tutti')
  const [showForm, setShowForm] = useState(false)

  const fetchProducts = async () => {
    if (!activeCompany) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', activeCompany.id)
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchProducts() }, [activeCompany])

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'Tutti' || p.category === category
    const status = getStockStatus(p)
    const matchStock = stockFilter === 'tutti' || status === stockFilter
    return matchSearch && matchCategory && matchStock
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Inventario</h1>
          <p className="text-muted mt-1">{products.length} prodotti totali</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuovo Prodotto</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Cerca per nome o SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['tutti', 'ok', 'low', 'out'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStockFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                stockFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              )}
            >
              {s === 'tutti' ? 'Tutte le scorte' : getStockStatusLabel(s)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                category === c ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Products list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Package size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600 dark:text-slate-300">Nessun prodotto trovato</p>
          <p className="text-muted mt-1">Aggiungi il primo prodotto o modifica i filtri</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4">Aggiungi Prodotto</button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card hidden lg:block overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prodotto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Disponibile</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Prezzo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Stato</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-800">
                {filtered.map(p => {
                  const status = getStockStatus(p)
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                          {p.sku && <p className="text-xs text-slate-400">SKU: {p.sku}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{p.category ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.available_quantity}</span>
                        {p.minimum_stock > 0 && <p className="text-xs text-slate-400">min {p.minimum_stock}</p>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{formatCurrency(p.selling_price)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`status-badge ${getStockStatusColor(status)}`}>{getStockStatusLabel(status)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/inventario/${p.id}`} className="text-blue-600 hover:text-blue-700">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {filtered.map(p => {
              const status = getStockStatus(p)
              return (
                <Link key={p.id} href={`/inventario/${p.id}`} className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-shadow">
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.category ?? 'Nessuna categoria'} · Disp: {p.available_quantity}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`status-badge ${getStockStatusColor(status)}`}>{getStockStatusLabel(status)}</span>
                    <p className="text-xs text-slate-500 mt-1">{formatCurrency(p.selling_price)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {showForm && (
        <ProductFormModal
          companyId={activeCompany!.id}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchProducts() }}
        />
      )}
    </div>
  )
}
