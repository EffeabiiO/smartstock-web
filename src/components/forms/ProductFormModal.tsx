'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = ['Prodotto Finito', 'Componente', 'Materia Prima', 'Semilavorato']

interface Props {
  companyId: string
  product?: Product
  onClose: () => void
  onSaved: () => void
}

export default function ProductFormModal({ companyId, product, onClose, onSaved }: Props) {
  const supabase = createClient()
  const isEdit = !!product

  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    category: product?.category ?? '',
    unit_cost: product?.unit_cost?.toString() ?? '',
    selling_price: product?.selling_price?.toString() ?? '',
    minimum_stock: product?.minimum_stock?.toString() ?? '0',
    available_quantity: product?.available_quantity?.toString() ?? '0',
  })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Il nome è obbligatorio'); return }
    setLoading(true)

    const payload = {
      company_id: companyId,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category || null,
      unit_cost: form.unit_cost ? parseFloat(form.unit_cost) : null,
      selling_price: form.selling_price ? parseFloat(form.selling_price) : null,
      minimum_stock: parseFloat(form.minimum_stock) || 0,
      available_quantity: parseFloat(form.available_quantity) || 0,
    }

    let error
    if (isEdit) {
      ;({ error } = await supabase.from('products').update(payload).eq('id', product.id))
    } else {
      ;({ error } = await supabase.from('products').insert(payload))
    }

    if (error) { toast.error('Errore durante il salvataggio'); setLoading(false); return }

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      action: isEdit ? 'product_updated' : 'product_created',
      payload: { name: payload.name },
    })

    toast.success(isEdit ? 'Prodotto aggiornato' : 'Prodotto creato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 rounded-t-2xl">
          <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">{isEdit ? 'Modifica Prodotto' : 'Nuovo Prodotto'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nome prodotto" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Codice articolo" />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">Seleziona...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Costo Unitario (€)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => set('unit_cost', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Prezzo Vendita (€)</label>
              <input className="input" type="number" step="0.01" min="0" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantità Disponibile</label>
              <input className="input" type="number" step="0.001" min="0" value={form.available_quantity} onChange={e => set('available_quantity', e.target.value)} />
            </div>
            <div>
              <label className="label">Scorta Minima</label>
              <input className="input" type="number" step="0.001" min="0" value={form.minimum_stock} onChange={e => set('minimum_stock', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Salvataggio...' : isEdit ? 'Salva Modifiche' : 'Crea Prodotto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
