'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Product, ProductComponent } from '@/types'
import { formatCurrency, getStockStatus, getStockStatusColor, getStockStatusLabel, calculateProducibility, ComponentWithProduct } from '@/lib/utils'
import { ArrowLeft, Edit2, Trash2, Plus, Package, AlertTriangle, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import ProductFormModal from '@/components/forms/ProductFormModal'
import StockAdjustModal from '@/components/forms/StockAdjustModal'
import AddComponentModal from '@/components/forms/AddComponentModal'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeCompany } = useCompany()
  const supabase = createClient()

  const [product, setProduct] = useState<Product | null>(null)
  const [components, setComponents] = useState<ComponentWithProduct[]>([])
  const [usedIn, setUsedIn] = useState<(ProductComponent & { parent: Product })[]>([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showStockAdj, setShowStockAdj] = useState(false)
  const [showAddComp, setShowAddComp] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    const [prodRes, compRes, usedRes] = await Promise.all([
      supabase.from('products').select('*').eq('id', id).single(),
      supabase.from('product_components').select('*, component:products!component_product_id(*)').eq('parent_product_id', id),
      supabase.from('product_components').select('*, parent:products!parent_product_id(*)').eq('component_product_id', id),
    ])
    setProduct(prodRes.data)
    setComponents((compRes.data ?? []) as ComponentWithProduct[])
    setUsedIn((usedRes.data ?? []) as (ProductComponent & { parent: Product })[])
    setLoading(false)
  }

  useEffect(() => { if (id) fetchAll() }, [id])

  const handleDelete = async () => {
    if (!confirm('Eliminare questo prodotto? L\'operazione non è reversibile.')) return
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) { toast.error('Errore durante l\'eliminazione'); return }
    await supabase.from('audit_logs').insert({
      company_id: activeCompany!.id,
      action: 'product_deleted',
      payload: { product_id: id, product_name: product?.name },
    })
    toast.success('Prodotto eliminato')
    router.push('/inventario')
  }

  const handleDeleteComponent = async (compId: string) => {
    const { error } = await supabase.from('product_components').delete().eq('id', compId)
    if (error) { toast.error('Errore'); return }
    toast.success('Componente rimosso')
    fetchAll()
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!product) return <div className="card p-12 text-center"><p className="text-muted">Prodotto non trovato</p></div>

  const stockStatus = getStockStatus(product)
  const producibility = components.length > 0 ? calculateProducibility(components) : null

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="page-title">{product.name}</h1>
          {product.sku && <p className="text-muted">SKU: {product.sku}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowEdit(true)} className="btn-secondary flex items-center gap-2">
            <Edit2 size={14} /> <span className="hidden sm:inline">Modifica</span>
          </button>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-2">
            <Trash2 size={14} /> <span className="hidden sm:inline">Elimina</span>
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Product info */}
        <div className="card p-5 space-y-4">
          <h2 className="section-title">Informazioni Prodotto</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted mb-1">Categoria</p>
              <p className="font-medium">{product.category ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted mb-1">Stato Scorte</p>
              <span className={`status-badge ${getStockStatusColor(stockStatus)}`}>{getStockStatusLabel(stockStatus)}</span>
            </div>
            <div>
              <p className="text-muted mb-1">Costo Unitario</p>
              <p className="font-medium">{formatCurrency(product.unit_cost)}</p>
            </div>
            <div>
              <p className="text-muted mb-1">Prezzo Vendita</p>
              <p className="font-medium text-green-700 dark:text-green-400">{formatCurrency(product.selling_price)}</p>
            </div>
            {product.unit_cost && product.selling_price && (
              <div className="col-span-2">
                <p className="text-muted mb-1">Margine</p>
                <p className="font-semibold text-blue-700 dark:text-blue-400">
                  {formatCurrency(product.selling_price - product.unit_cost)} ({((( product.selling_price - product.unit_cost) / product.selling_price) * 100).toFixed(1)}%)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stock info */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="section-title">Magazzino</h2>
            <button onClick={() => setShowStockAdj(true)} className="btn-secondary text-xs py-1.5 px-3">Rettifica</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.available_quantity}</p>
              <p className="text-xs text-slate-500 mt-1">Disponibile</p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{product.reserved_quantity}</p>
              <p className="text-xs text-slate-500 mt-1">Riservato</p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{product.minimum_stock}</p>
              <p className="text-xs text-slate-500 mt-1">Minimo</p>
            </div>
          </div>
        </div>
      </div>

      {/* Producibility */}
      {producibility && (
        <div className={`card p-5 border-l-4 ${producibility.is_producible ? 'border-green-400' : 'border-red-400'}`}>
          <div className="flex items-center gap-2 mb-3">
            {producibility.is_producible
              ? <CheckCircle size={18} className="text-green-500" />
              : <XCircle size={18} className="text-red-500" />
            }
            <h2 className="section-title">Producibilità</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted mb-1">Producibile</p>
              <p className={`font-semibold ${producibility.is_producible ? 'text-green-700' : 'text-red-600'}`}>
                {producibility.is_producible ? 'Sì' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-muted mb-1">Quantità Max Producibile</p>
              <p className="font-bold text-slate-900 dark:text-slate-100">{producibility.max_producible}</p>
            </div>
            {producibility.bottleneck && (
              <div>
                <p className="text-muted mb-1">Collo di Bottiglia</p>
                <p className="font-semibold text-amber-700 dark:text-amber-400">{producibility.bottleneck.product.name}</p>
                <p className="text-xs text-slate-400">Disp: {producibility.bottleneck.available} / Rich: {producibility.bottleneck.required}</p>
              </div>
            )}
          </div>
          {producibility.missing.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Componenti Mancanti</p>
              <div className="space-y-1">
                {producibility.missing.map(m => (
                  <div key={m.product.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{m.product.name}</span>
                    <span className="text-red-600 font-medium">Mancano: {m.missing_quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOM / Components */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Distinta Base (Componenti)</h2>
          <button onClick={() => setShowAddComp(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus size={13} /> Aggiungi
          </button>
        </div>
        {components.length === 0
          ? <p className="text-muted text-sm">Nessun componente definito. Questo prodotto non ha una distinta base.</p>
          : <div className="space-y-2">
              {components.map(c => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.component.name}</p>
                    <p className="text-xs text-slate-400">SKU: {c.component.sku ?? '—'} · Disp: {c.component.available_quantity}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">× {c.quantity_required}</p>
                      <p className="text-xs text-slate-400">richiesti</p>
                    </div>
                    <button onClick={() => handleDeleteComponent(c.id)} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-950 rounded-lg transition-colors">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Used in */}
      {usedIn.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-3">Utilizzato in</h2>
          <div className="space-y-2">
            {usedIn.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-xl">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{u.parent.name}</p>
                <span className="text-xs text-blue-600">× {u.quantity_required}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEdit && (
        <ProductFormModal
          companyId={activeCompany!.id}
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); fetchAll() }}
        />
      )}
      {showStockAdj && (
        <StockAdjustModal
          product={product}
          companyId={activeCompany!.id}
          onClose={() => setShowStockAdj(false)}
          onSaved={() => { setShowStockAdj(false); fetchAll() }}
        />
      )}
      {showAddComp && (
        <AddComponentModal
          parentProductId={product.id}
          companyId={activeCompany!.id}
          existingComponentIds={components.map(c => c.component_product_id)}
          onClose={() => setShowAddComp(false)}
          onSaved={() => { setShowAddComp(false); fetchAll() }}
        />
      )}
    </div>
  )
}
