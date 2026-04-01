'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { ProductionTask, Product } from '@/types'
import { formatDateTime, getProductionStatusColor, getProductionStatusLabel, cn } from '@/lib/utils'
import { Factory, Plus, CheckCircle, PlayCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import NewTaskModal from '@/components/forms/NewTaskModal'

const STATUS_FILTERS = ['tutti', 'in_attesa', 'in_corso', 'completato', 'annullato']

export default function ProducibilePage() {
  const { activeCompany } = useCompany()
  const supabase = createClient()
  const [tasks, setTasks] = useState<(ProductionTask & { product: Product })[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('tutti')
  const [showNew, setShowNew] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchTasks = async () => {
    if (!activeCompany) return
    setLoading(true)
    const { data } = await supabase
      .from('production_tasks')
      .select('*, product:products(*)')
      .eq('company_id', activeCompany.id)
      .order('created_at', { ascending: false })
    setTasks((data ?? []) as (ProductionTask & { product: Product })[])
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [activeCompany])

  const updateStatus = async (task: ProductionTask & { product: Product }, newStatus: string) => {
    setUpdating(task.id)
    const { error } = await supabase.from('production_tasks').update({ status: newStatus }).eq('id', task.id)
    if (error) { toast.error('Errore aggiornamento'); setUpdating(null); return }

    // If completed: add inventory + log
    if (newStatus === 'completato') {
      const newQty = task.product.available_quantity + task.quantity
      await supabase.from('products').update({ available_quantity: newQty }).eq('id', task.product_id)
      await supabase.from('inventory_movements').insert({
        company_id: activeCompany!.id,
        product_id: task.product_id,
        type: 'produzione',
        quantity: task.quantity,
        note: `Produzione completata — task ${task.id.slice(0, 8)}`,
      })
      await supabase.from('audit_logs').insert({
        company_id: activeCompany!.id,
        action: 'production_completed',
        payload: { task_id: task.id, product_id: task.product_id, product_name: task.product.name, quantity: task.quantity },
      })
      toast.success(`Produzione completata! +${task.quantity} ${task.product.name} in magazzino`)
    } else {
      toast.success(`Stato aggiornato: ${getProductionStatusLabel(newStatus)}`)
    }

    fetchTasks()
    setUpdating(null)
  }

  const filtered = tasks.filter(t => statusFilter === 'tutti' || t.status === statusFilter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Produzione</h1>
          <p className="text-muted mt-1">{tasks.filter(t => ['in_attesa', 'in_corso'].includes(t.status)).length} attività attive</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          <span className="hidden sm:inline">Nuovo Task</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex gap-2 overflow-x-auto">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors',
                statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-600 hover:bg-slate-200'
              )}
            >
              {s === 'tutti' ? 'Tutti' : getProductionStatusLabel(s)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Factory size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">Nessun task di produzione</p>
          <button onClick={() => setShowNew(true)} className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={16} />Crea Task</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(task => (
            <div key={task.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Factory size={18} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{task.product?.name ?? '—'}</p>
                    <span className={`status-badge ${getProductionStatusColor(task.status)}`}>{getProductionStatusLabel(task.status)}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">Quantità: <b className="text-slate-700 dark:text-slate-300">{task.quantity}</b></p>
                  <p className="text-xs text-slate-400 mt-1">{formatDateTime(task.created_at)}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {task.status === 'in_attesa' && (
                    <button
                      onClick={() => updateStatus(task, 'in_corso')}
                      disabled={updating === task.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <PlayCircle size={13} /> Inizia
                    </button>
                  )}
                  {task.status === 'in_corso' && (
                    <button
                      onClick={() => updateStatus(task, 'completato')}
                      disabled={updating === task.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle size={13} /> Completa
                    </button>
                  )}
                  {!['completato', 'annullato'].includes(task.status) && (
                    <button
                      onClick={() => updateStatus(task, 'annullato')}
                      disabled={updating === task.id}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewTaskModal
          companyId={activeCompany!.id}
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); fetchTasks() }}
        />
      )}
    </div>
  )
}
