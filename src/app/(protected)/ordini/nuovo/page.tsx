'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Product } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface OrderLine {
  product: Product | null
  quantity: number
  // computed
  allocated: number
  to_produce: number
  unit_cost: number
  revenue: number
  cost: number
  margin: number
}

function emptyLine(): OrderLine {
  return { product: null, quantity: 1, allocated: 0, to_produce: 0, unit_cost: 0, revenue: 0, cost: 0, margin: 0 }
}

export default function NuovoOrdinePage() {
  const router = useRouter()
  const { activeCompany } = useCompany()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [customerName, setCustomerName] = useState('')
  const [lines, setLines] = useState<OrderLine[]>([emptyLine()])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!activeCompany) return
    supabase.from('products').select('*').eq('company_id', activeCompany.id).order('name').then(({ data }) => setProducts(data ?? []))
  }, [activeCompany])

  const computeLine = (product: Product, quantity: number): Partial<OrderLine> => {
    const available = product.available_quantity
    const allocated = Math.min(available, quantity)
    const to_produce = Math.max(0, quantity - allocated)
    const revenue = (product.selling_price ?? 0) * quantity
    const cost = (product.unit_cost ?? 0) * quantity
    const margin = revenue - cost
    return { allocated, to_produce, revenue, cost, margin, unit_cost: product.unit_cost ?? 0 }
  }

  const setLine = (i: number, updates: Partial<OrderLine>) => {
    setLines(prev => {
      const next = [...prev]
      next[i] = { ...next[i], ...updates }
      if (updates.product !== undefined || updates.quantity !== undefined) {
        const p = updates.product ?? next[i].product
        const q = updates.quantity ?? next[i].quantity
        if (p) Object.assign(next[i], computeLine(p, q))
      }
      return next
    })
  }

  const addLine = () => setLines(l => [...l, emptyLine()])
  const removeLine = (i: number) => setLines(l => l.filter((_, idx) => idx !== i))

  const totals = lines.reduce(
    (acc, l) => ({ revenue: acc.revenue + l.revenue, cost: acc.cost + l.cost, margin: acc.margin + l.margin }),
    { revenue: 0, cost: 0, margin: 0 }
  )

  const handleSubmit = async (status: 'bozza' | 'confermato') => {
    if (lines.some(l => !l.product)) { toast.error('Seleziona un prodotto per ogni riga'); return }
    setSaving(true)
    try {
      // Create order
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          company_id: activeCompany!.id,
          customer_name: customerName.trim() || null,
          status,
          total_cost: totals.cost,
          total_revenue: totals.revenue,
          total_margin: totals.margin,
        })
        .select()
        .single()
      if (orderErr) throw orderErr

      // Insert order items
      const items = lines.map(l => ({
        order_id: order.id,
        product_id: l.product!.id,
        requested_quantity: l.quantity,
        allocated_quantity: l.allocated,
        quantity_to_produce: l.to_produce,
      }))
      await supabase.from('order_items').insert(items)

      // If confirmed: process stock + movements + production tasks
      if (status === 'confermato') {
        for (const l of lines) {
          if (!l.product) continue
          const newQty = Math.max(0, l.product.available_quantity - l.allocated)

          // Update product stock
          await supabase.from('products').update({ available_quantity: newQty }).eq('id', l.product.id)

          // Inventory movement
          if (l.allocated > 0) {
            await supabase.from('inventory_movements').insert({
              company_id: activeCompany!.id,
              product_id: l.product.id,
              type: 'allocazione',
              quantity: -l.allocated,
              note: `Ordine cliente: ${customerName || 'N/A'}`,
            })
          }

          // Production task if needed
          if (l.to_produce > 0) {
            await supabase.from('production_tasks').insert({
              company_id: activeCompany!.id,
              product_id: l.product.id,
              quantity: l.to_produce,
              status: 'in_attesa',
            })
          }
        }

        // Audit log
        await supabase.from('audit_logs').insert({
          company_id: activeCompany!.id,
          action: 'order_created_confirmed',
          payload: { order_id: order.id, customer: customerName, items: lines.length },
        })
      } else {
        await supabase.from('audit_logs').insert({
          company_id: activeCompany!.id,
          action: 'order_created_draft',
          payload: { order_id: order.id },
        })
      }

      toast.success(status === 'confermato' ? 'Ordine confermato e stock aggiornato!' : 'Bozza salvata')
      router.push(`/ordini/${order.id}`)
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Errore durante la creazione')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Nuovo Ordine</h1>
          <p className="text-muted mt-1">Crea un nuovo ordine cliente</p>
        </div>
      </div>

      {/* Customer */}
      <div className="card p-5">
        <h2 className="section-title mb-3">Cliente</h2>
        <input className="input" placeholder="Nome cliente (opzionale)" value={customerName} onChange={e => setCustomerName(e.target.value)} />
      </div>

      {/* Lines */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Prodotti</h2>
          <button onClick={addLine} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5">
            <Plus size={13} /> Aggiungi riga
          </button>
        </div>

        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="border border-slate-100 dark:border-gray-800 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div className="sm:col-span-2">
                  <label className="label">Prodotto</label>
                  <select
                    className="input"
                    value={line.product?.id ?? ''}
                    onChange={e => {
                      const p = products.find(p => p.id === e.target.value) ?? null
                      setLine(i, { product: p })
                    }}
                  >
                    <option value="">Seleziona prodotto...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.sku ? `(${p.sku})` : ''} — Disp: {p.available_quantity}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Quantità</label>
                  <div className="flex gap-2">
                    <input
                      className="input"
                      type="number" min="1" step="1"
                      value={line.quantity}
                      onChange={e => setLine(i, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                    {lines.length > 1 && (
                      <button onClick={() => removeLine(i)} className="p-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950 text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Line summary */}
              {line.product && (
                <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Allocato da stock</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{line.allocated}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Da produrre</p>
                    <p className={cn('font-semibold', line.to_produce > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-slate-100')}>{line.to_produce}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Ricavo</p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(line.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Margine</p>
                    <p className={cn('font-semibold', line.margin >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(line.margin)}</p>
                  </div>
                  {line.to_produce > 0 && (
                    <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-amber-600 text-xs">
                      <AlertTriangle size={13} />
                      <span>Verrà creato un task di produzione per {line.to_produce} unità</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="card p-5">
        <h2 className="section-title mb-3">Riepilogo</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center bg-slate-50 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Costo</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.cost)}</p>
          </div>
          <div className="text-center bg-slate-50 dark:bg-gray-800 rounded-xl p-3">
            <p className="text-slate-400 text-xs mb-1">Fatturato</p>
            <p className="font-bold text-slate-900 dark:text-slate-100">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className={cn('text-center rounded-xl p-3', totals.margin >= 0 ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950')}>
            <p className="text-slate-400 text-xs mb-1">Margine</p>
            <p className={cn('font-bold', totals.margin >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(totals.margin)}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => router.back()} className="btn-secondary flex-1">Annulla</button>
        <button onClick={() => handleSubmit('bozza')} className="btn-secondary flex-1" disabled={saving}>Salva Bozza</button>
        <button onClick={() => handleSubmit('confermato')} className="btn-primary flex-1" disabled={saving}>
          {saving ? 'Conferma...' : 'Conferma Ordine'}
        </button>
      </div>
    </div>
  )
}
