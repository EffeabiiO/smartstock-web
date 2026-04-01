'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { X, Search } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  parentProductId: string
  companyId: string
  existingComponentIds: string[]
  onClose: () => void
  onSaved: () => void
}

export default function AddComponentModal({ parentProductId, companyId, existingComponentIds, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('products').select('*').eq('company_id', companyId).order('name').then(({ data }) => setProducts(data ?? []))
  }, [companyId])

  const filtered = products.filter(p =>
    p.id !== parentProductId &&
    !existingComponentIds.includes(p.id) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const handleSave = async () => {
    if (!selected) { toast.error('Seleziona un componente'); return }
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { toast.error('Quantità non valida'); return }
    setLoading(true)
    const { error } = await supabase.from('product_components').insert({
      parent_product_id: parentProductId,
      component_product_id: selected.id,
      quantity_required: qty,
    })
    if (error) { toast.error('Errore durante il salvataggio'); setLoading(false); return }
    toast.success('Componente aggiunto')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-800">
          <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">Aggiungi Componente</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-10" placeholder="Cerca prodotto..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-muted text-sm text-center py-6">Nessun prodotto disponibile</p>
              : filtered.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(selected?.id === p.id ? null : p)}
                    className={`w-full text-left p-3 rounded-xl border transition-colors ${selected?.id === p.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-100 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800'}`}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{p.name}</p>
                    <p className="text-xs text-slate-400">Disp: {p.available_quantity}{p.sku ? ` · SKU: ${p.sku}` : ''}</p>
                  </button>
                ))
            }
          </div>
          {selected && (
            <div>
              <label className="label">Quantità Richiesta</label>
              <input className="input" type="number" step="0.001" min="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          )}
        </div>
        <div className="p-5 border-t border-slate-100 dark:border-gray-800 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annulla</button>
          <button onClick={handleSave} className="btn-primary flex-1" disabled={!selected || loading}>
            {loading ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>
      </div>
    </div>
  )
}
