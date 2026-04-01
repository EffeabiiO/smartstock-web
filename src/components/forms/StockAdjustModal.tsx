'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  product: Product
  companyId: string
  onClose: () => void
  onSaved: () => void
}

export default function StockAdjustModal({ product, companyId, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [type, setType] = useState<'carico' | 'scarico' | 'rettifica'>('carico')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { toast.error('Inserisci una quantità valida'); return }
    setLoading(true)

    let newQty = product.available_quantity
    if (type === 'carico') newQty += qty
    else if (type === 'scarico') newQty = Math.max(0, newQty - qty)
    else newQty = qty // rettifica assoluta

    const { error: updateError } = await supabase
      .from('products')
      .update({ available_quantity: newQty })
      .eq('id', product.id)

    if (updateError) { toast.error('Errore aggiornamento'); setLoading(false); return }

    await supabase.from('inventory_movements').insert({
      company_id: companyId,
      product_id: product.id,
      type,
      quantity: type === 'rettifica' ? qty : (type === 'scarico' ? -qty : qty),
      note: note.trim() || null,
    })

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      action: 'stock_adjusted',
      payload: { product_id: product.id, product_name: product.name, type, quantity: qty, new_quantity: newQty },
    })

    toast.success('Rettifica registrata')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-800">
          <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100">Rettifica Magazzino</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 text-sm">
            <p className="text-slate-500">Prodotto: <span className="font-semibold text-slate-900 dark:text-slate-100">{product.name}</span></p>
            <p className="text-slate-500 mt-1">Disponibile attuale: <span className="font-bold text-blue-600">{product.available_quantity}</span></p>
          </div>
          <div>
            <label className="label">Tipo Movimento</label>
            <div className="grid grid-cols-3 gap-2">
              {(['carico', 'scarico', 'rettifica'] as const).map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setType(t)}
                  className={`py-2 rounded-xl text-sm font-medium border transition-colors ${type === t ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-gray-700 text-slate-600 hover:border-blue-300'}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">{type === 'rettifica' ? 'Nuova Quantità Assoluta' : 'Quantità'}</label>
            <input className="input" type="number" step="0.001" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" required />
          </div>
          <div>
            <label className="label">Note (opzionale)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Motivo della rettifica..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Conferma'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
