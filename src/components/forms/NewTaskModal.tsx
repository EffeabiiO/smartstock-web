'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Product } from '@/types'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props { companyId: string; onClose: () => void; onSaved: () => void }

export default function NewTaskModal({ companyId, onClose, onSaved }: Props) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('products').select('*').eq('company_id', companyId).order('name').then(({ data }) => setProducts(data ?? []))
  }, [companyId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productId) { toast.error('Seleziona un prodotto'); return }
    const qty = parseFloat(quantity)
    if (!qty || qty <= 0) { toast.error('Quantità non valida'); return }
    setLoading(true)
    const { error } = await supabase.from('production_tasks').insert({
      company_id: companyId,
      product_id: productId,
      quantity: qty,
      status: 'in_attesa',
    })
    if (error) { toast.error('Errore durante la creazione'); setLoading(false); return }
    await supabase.from('audit_logs').insert({
      company_id: companyId,
      action: 'production_task_created',
      payload: { product_id: productId, quantity: qty },
    })
    toast.success('Task di produzione creato')
    onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-gray-800">
          <h2 className="font-bold text-lg">Nuovo Task Produzione</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg"><X size={18} /></button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="label">Prodotto *</label>
            <select className="input" value={productId} onChange={e => setProductId(e.target.value)} required>
              <option value="">Seleziona prodotto...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantità da Produrre *</label>
            <input className="input" type="number" min="1" step="0.001" value={quantity} onChange={e => setQuantity(e.target.value)} required />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annulla</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
