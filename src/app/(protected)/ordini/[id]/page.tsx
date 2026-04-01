'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { Order, OrderItem, Product } from '@/types'
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel, cn } from '@/lib/utils'
import { ArrowLeft, Edit2, Package } from 'lucide-react'
import toast from 'react-hot-toast'

const NEXT_STATUS: Record<string, string> = {
  bozza: 'confermato',
  confermato: 'in_produzione',
  in_produzione: 'completato',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { activeCompany } = useCompany()
  const supabase = createClient()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<(OrderItem & { product: Product })[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', id).single(),
      supabase.from('order_items').select('*, product:products(*)').eq('order_id', id),
    ])
    setOrder(orderRes.data)
    setItems((itemsRes.data ?? []) as (OrderItem & { product: Product })[])
    setLoading(false)
  }

  useEffect(() => { if (id) fetchAll() }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    setUpdating(true)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    if (error) { toast.error('Errore aggiornamento stato'); setUpdating(false); return }

    await supabase.from('audit_logs').insert({
      company_id: activeCompany!.id,
      action: 'order_status_changed',
      payload: { order_id: id, from: order.status, to: newStatus },
    })

    toast.success(`Stato aggiornato: ${getOrderStatusLabel(newStatus)}`)
    fetchAll()
    setUpdating(false)
  }

  const handleCancel = async () => {
    if (!confirm('Annullare questo ordine?')) return
    await handleStatusChange('annullato')
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!order) return <div className="card p-12 text-center"><p className="text-muted">Ordine non trovato</p></div>

  const nextStatus = NEXT_STATUS[order.status]
  const canCancel = !['completato', 'annullato'].includes(order.status)

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="page-title">{order.customer_name ?? 'Ordine senza cliente'}</h1>
            <span className={`status-badge ${getOrderStatusColor(order.status)}`}>{getOrderStatusLabel(order.status)}</span>
          </div>
          <p className="text-muted mt-1">{formatDateTime(order.created_at)}</p>
        </div>
        {nextStatus && (
          <button onClick={() => handleStatusChange(nextStatus)} className="btn-primary" disabled={updating}>
            → {getOrderStatusLabel(nextStatus)}
          </button>
        )}
        {canCancel && (
          <button onClick={handleCancel} className="btn-ghost text-red-500" disabled={updating}>Annulla</button>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Costo Totale</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.total_cost)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Fatturato</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(order.total_revenue)}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Margine</p>
          <p className={cn('text-2xl font-bold', (order.total_margin ?? 0) >= 0 ? 'text-green-700' : 'text-red-600')}>
            {formatCurrency(order.total_margin)}
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Prodotti Ordinati</h2>
        {items.length === 0
          ? <p className="text-muted">Nessun prodotto in questo ordine</p>
          : <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-gray-800 rounded-xl">
                  <div className="w-9 h-9 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-100 dark:border-gray-700">
                    <Package size={16} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.product?.name ?? '—'}</p>
                    <div className="grid grid-cols-3 gap-2 mt-1.5 text-xs text-slate-500">
                      <span>Richiesto: <b className="text-slate-700 dark:text-slate-300">{item.requested_quantity}</b></span>
                      <span>Allocato: <b className="text-slate-700 dark:text-slate-300">{item.allocated_quantity}</b></span>
                      <span className={cn(((item.quantity_to_produce ?? 0) > 0) ? 'text-amber-600' : '')}>
                        Da produrre: <b>{item.quantity_to_produce}</b>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {formatCurrency((item.product?.selling_price ?? 0) * (item.requested_quantity ?? 0))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  )
}
