'use client'

import type { Order as AppOrder, Product } from '@/types'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCompany } from '@/hooks/useCompany'
import { formatCurrency, formatDate, getOrderStatusColor, getOrderStatusLabel, getProductionStatusColor, getProductionStatusLabel } from '@/lib/utils'
import { Order, ProductionTask, Product } from '@/types'
import { ShoppingCart, Factory, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Stats {
  active_orders: number
  active_production: number
  low_stock: number
  revenue_month: number
}

export default function DashboardPage() {
  const { activeCompany } = useCompany()
  const supabase = createClient()
  const [stats, setStats] = useState<Stats>({ active_orders: 0, active_production: 0, low_stock: 0, revenue_month: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [activeTasks, setActiveTasks] = useState<(ProductionTask & { product: Product })[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [chartData, setChartData] = useState<{ month: string; fatturato: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return
    const load = async () => {
      setLoading(true)
      const cid = activeCompany.id

      const [ordersRes, tasksRes, productsRes] = await Promise.all([
        supabase.from('orders').select('*').eq('company_id', cid).order('created_at', { ascending: false }).limit(5),
        supabase.from('production_tasks').select('*, product:products(*)').eq('company_id', cid).in('status', ['in_attesa', 'in_corso']).order('created_at', { ascending: false }).limit(5),
        supabase.from('products').select('*').eq('company_id', cid),
      ])

      const orders: AppOrder[] = (ordersRes.data ?? []) as AppOrder[]
const products: Product[] = (productsRes.data ?? []) as Product[]
      const tasks = tasksRes.data ?? []
      

      const activeOrders = orders.filter(o => !['completato', 'annullato'].includes(o.status))
      const lowStock = products.filter(p => p.available_quantity <= p.minimum_stock && p.minimum_stock > 0)

      // Revenue this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const { data: monthOrders } = await supabase
        .from('orders')
        .select('total_revenue')
        .eq('company_id', cid)
        .eq('status', 'completato')
        .gte('created_at', startOfMonth)

      const revenue = (monthOrders ?? []).reduce((s, o) => s + (o.total_revenue ?? 0), 0)

      // Chart: last 6 months
      const months: { month: string; fatturato: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = d.toISOString()
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).toISOString()
        const { data: mo } = await supabase
          .from('orders')
          .select('total_revenue')
          .eq('company_id', cid)
          .eq('status', 'completato')
          .gte('created_at', start)
          .lt('created_at', end)
        const total = (mo ?? []).reduce((s, o) => s + (o.total_revenue ?? 0), 0)
        months.push({ month: d.toLocaleDateString('it-IT', { month: 'short' }), fatturato: total })
      }

      setStats({ active_orders: activeOrders.length, active_production: tasks.length, low_stock: lowStock.length, revenue_month: revenue })
      setRecentOrders(orders.slice(0, 5))
      setActiveTasks(tasks as (ProductionTask & { product: Product })[])
      setLowStockProducts(lowStock.slice(0, 4))
      setChartData(months)
      setLoading(false)
    }
    load()
  }, [activeCompany])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted mt-1">Panoramica della tua attività</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Ordini Attivi</span>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-lg flex items-center justify-center">
              <ShoppingCart size={16} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.active_orders}</p>
          <Link href="/ordini" className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
            Vedi ordini <ArrowRight size={10} />
          </Link>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Fatturato Mese</span>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-950 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-green-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatCurrency(stats.revenue_month)}</p>
          <p className="text-xs text-slate-400 mt-1">Ordini completati</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Produzione</span>
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-950 rounded-lg flex items-center justify-center">
              <Factory size={16} className="text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.active_production}</p>
          <Link href="/produzione" className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
            Attività attive <ArrowRight size={10} />
          </Link>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-xs font-medium uppercase tracking-wide">Scorte Basse</span>
            <div className="w-8 h-8 bg-red-100 dark:bg-red-950 rounded-lg flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{stats.low_stock}</p>
          <Link href="/insights" className="text-xs text-blue-600 hover:underline mt-1 flex items-center gap-1">
            Vedi insights <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h2 className="section-title mb-4">Fatturato ultimi 6 mesi</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorFatturato" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip formatter={(v: number) => [formatCurrency(v), 'Fatturato']} contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
              <Area type="monotone" dataKey="fatturato" stroke="#2563eb" strokeWidth={2} fill="url(#colorFatturato)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Recent Orders */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Ordini Recenti</h2>
            <Link href="/ordini" className="text-sm text-blue-600 hover:underline">Vedi tutti</Link>
          </div>
          {recentOrders.length === 0
            ? <p className="text-muted text-center py-6">Nessun ordine ancora</p>
            : <div className="space-y-2">
                {recentOrders.map(o => (
                  <Link key={o.id} href={`/ordini/${o.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{o.customer_name ?? 'Cliente —'}</p>
                      <p className="text-xs text-slate-400">{formatDate(o.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`status-badge ${getOrderStatusColor(o.status)}`}>{getOrderStatusLabel(o.status)}</span>
                      <p className="text-xs text-slate-500 mt-1">{formatCurrency(o.total_revenue)}</p>
                    </div>
                  </Link>
                ))}
              </div>
          }
        </div>

        {/* Active production */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Produzione Attiva</h2>
            <Link href="/produzione" className="text-sm text-blue-600 hover:underline">Vedi tutti</Link>
          </div>
          {activeTasks.length === 0
            ? <p className="text-muted text-center py-6">Nessuna attività attiva</p>
            : <div className="space-y-2">
                {activeTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-800">
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t.product?.name ?? '—'}</p>
                      <p className="text-xs text-slate-400">Qtà: {t.quantity}</p>
                    </div>
                    <span className={`status-badge ${getProductionStatusColor(t.status)}`}>{getProductionStatusLabel(t.status)}</span>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="card p-5 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="section-title text-amber-700 dark:text-amber-400">Alert Scorte Basse</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {lowStockProducts.map(p => (
              <Link key={p.id} href={`/inventario/${p.id}`} className="p-3 bg-amber-50 dark:bg-amber-950 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{p.name}</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Disp: {p.available_quantity} / Min: {p.minimum_stock}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
