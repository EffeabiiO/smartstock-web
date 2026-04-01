'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Product } from '@/types'
import { calculateProducibility, ComponentWithProduct, formatCurrency, getStockStatusColor, getStockStatusLabel, getStockStatus } from '@/lib/utils'
import { AlertTriangle, TrendingUp, Package, Wrench, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface ProductWithBOM extends Product {
  components: ComponentWithProduct[]
}

export default function InsightsPage() {
  const { activeCompany } = useCompany()
  const supabase = createClient()
  const [lowStock, setLowStock] = useState<Product[]>([])
  const [outOfStock, setOutOfStock] = useState<Product[]>([])
  const [productsWithBOM, setProductsWithBOM] = useState<ProductWithBOM[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return
    const load = async () => {
      setLoading(true)
      const { data: products } = await supabase.from('products').select('*').eq('company_id', activeCompany.id).order('name')
      const { data: components } = await supabase.from('product_components').select('*, component:products!component_product_id(*)').in('parent_product_id', (products ?? []).map(p => p.id))

      const allProducts = products ?? []
      const allComponents = (components ?? []) as ComponentWithProduct[]

      setLowStock(allProducts.filter(p => p.available_quantity <= p.minimum_stock && p.minimum_stock > 0 && p.available_quantity > 0))
      setOutOfStock(allProducts.filter(p => p.available_quantity <= 0))

      // Build BOM map
      const bomMap: Record<string, ComponentWithProduct[]> = {}
      for (const c of allComponents) {
        if (!bomMap[c.parent_product_id]) bomMap[c.parent_product_id] = []
        bomMap[c.parent_product_id].push(c)
      }

      const withBOM = allProducts
        .filter(p => bomMap[p.id]?.length)
        .map(p => ({ ...p, components: bomMap[p.id] }))
      setProductsWithBOM(withBOM)
      setLoading(false)
    }
    load()
  }, [activeCompany])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Insights</h1>
        <p className="text-muted mt-1">Analisi magazzino, producibilità e colli di bottiglia</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-l-4 border-red-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Esauriti</p>
          <p className="text-3xl font-bold text-red-600">{outOfStock.length}</p>
        </div>
        <div className="stat-card border-l-4 border-amber-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Scorta Bassa</p>
          <p className="text-3xl font-bold text-amber-600">{lowStock.length}</p>
        </div>
        <div className="stat-card border-l-4 border-green-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Producibili</p>
          <p className="text-3xl font-bold text-green-600">
            {productsWithBOM.filter(p => calculateProducibility(p.components).is_producible).length}
          </p>
        </div>
        <div className="stat-card border-l-4 border-blue-400">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Con Distinta Base</p>
          <p className="text-3xl font-bold text-blue-600">{productsWithBOM.length}</p>
        </div>
      </div>

      {/* Out of stock */}
      {outOfStock.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle size={18} className="text-red-500" />
            <h2 className="section-title">Prodotti Esauriti</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {outOfStock.map(p => (
              <Link key={p.id} href={`/inventario/${p.id}`} className="p-3 bg-red-50 dark:bg-red-950 rounded-xl hover:bg-red-100 transition-colors">
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                <p className="text-xs text-red-600 mt-1">Disponibile: 0 · Min: {p.minimum_stock}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="section-title">Scorte Basse</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStock.map(p => (
              <Link key={p.id} href={`/inventario/${p.id}`} className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl hover:bg-amber-100 transition-colors">
                <p className="font-semibold text-sm text-slate-900 dark:text-slate-100">{p.name}</p>
                <div className="mt-1.5 bg-amber-100 dark:bg-amber-900 rounded-full h-1.5">
                  <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (p.available_quantity / p.minimum_stock) * 100)}%` }} />
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Disp: {p.available_quantity} / Min: {p.minimum_stock}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* BOM producibility analysis */}
      {productsWithBOM.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={18} className="text-blue-500" />
            <h2 className="section-title">Analisi Producibilità</h2>
          </div>
          <div className="space-y-3">
            {productsWithBOM.map(p => {
              const prod = calculateProducibility(p.components)
              return (
                <div key={p.id} className="border border-slate-100 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {prod.is_producible
                        ? <CheckCircle size={15} className="text-green-500" />
                        : <XCircle size={15} className="text-red-500" />
                      }
                      <Link href={`/inventario/${p.id}`} className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-blue-600">
                        {p.name}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Max producibile:</span>
                      <span className={`text-sm font-bold ${prod.is_producible ? 'text-green-700' : 'text-red-600'}`}>{prod.max_producible}</span>
                    </div>
                  </div>
                  {prod.bottleneck && (
                    <div className="text-xs bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 rounded-lg px-3 py-1.5 mt-2">
                      ⚠ Collo di bottiglia: <b>{prod.bottleneck.product.name}</b> — Disp: {prod.bottleneck.available} / Rich: {prod.bottleneck.required}
                    </div>
                  )}
                  {prod.missing.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {prod.missing.map(m => (
                        <div key={m.product.id} className="text-xs text-red-600 flex justify-between bg-red-50 dark:bg-red-950 rounded-lg px-3 py-1.5">
                          <span>{m.product.name}</span>
                          <span>Mancano: <b>{m.missing_quantity}</b></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!outOfStock.length && !lowStock.length && !productsWithBOM.length && (
        <div className="card p-12 text-center">
          <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Tutto in ordine!</p>
          <p className="text-muted mt-1">Nessun alert attivo al momento</p>
        </div>
      )}
    </div>
  )
}
