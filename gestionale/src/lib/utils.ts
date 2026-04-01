import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Product, ProducibilityInfo } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('it-IT').format(value)
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr))
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

export function getOrderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    bozza: 'Bozza',
    confermato: 'Confermato',
    in_produzione: 'In Produzione',
    completato: 'Completato',
    annullato: 'Annullato',
  }
  return map[status] ?? status
}

export function getOrderStatusColor(status: string): string {
  const map: Record<string, string> = {
    bozza: 'bg-gray-100 text-gray-600',
    confermato: 'bg-blue-100 text-blue-700',
    in_produzione: 'bg-amber-100 text-amber-700',
    completato: 'bg-green-100 text-green-700',
    annullato: 'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function getProductionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    in_attesa: 'In Attesa',
    in_corso: 'In Corso',
    completato: 'Completato',
    annullato: 'Annullato',
  }
  return map[status] ?? status
}

export function getProductionStatusColor(status: string): string {
  const map: Record<string, string> = {
    in_attesa: 'bg-gray-100 text-gray-600',
    in_corso: 'bg-amber-100 text-amber-700',
    completato: 'bg-green-100 text-green-700',
    annullato: 'bg-red-100 text-red-600',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function getStockStatus(product: Product): 'ok' | 'low' | 'out' {
  if (product.available_quantity <= 0) return 'out'
  if (product.available_quantity <= product.minimum_stock) return 'low'
  return 'ok'
}

export function getStockStatusLabel(status: 'ok' | 'low' | 'out'): string {
  const map = { ok: 'Disponibile', low: 'Scorta Bassa', out: 'Esaurito' }
  return map[status]
}

export function getStockStatusColor(status: 'ok' | 'low' | 'out'): string {
  const map = {
    ok: 'bg-green-100 text-green-700',
    low: 'bg-amber-100 text-amber-700',
    out: 'bg-red-100 text-red-600',
  }
  return map[status]
}

export interface ComponentWithProduct {
  id: string
  parent_product_id: string
  component_product_id: string
  quantity_required: number
  component: Product
}

export function calculateProducibility(
  components: ComponentWithProduct[]
): ProducibilityInfo {
  if (components.length === 0) {
    return { is_producible: false, max_producible: 0, bottleneck: null, missing: [] }
  }

  let maxProducible = Infinity
  let bottleneck: ProducibilityInfo['bottleneck'] = null
  const missing: ProducibilityInfo['missing'] = []

  for (const comp of components) {
    const available = comp.component.available_quantity
    const required = comp.quantity_required
    const canProduce = Math.floor(available / required)

    if (canProduce < maxProducible) {
      maxProducible = canProduce
      bottleneck = { product: comp.component, available, required }
    }

    if (available < required) {
      missing.push({
        product: comp.component,
        missing_quantity: required - available,
      })
    }
  }

  if (maxProducible === Infinity) maxProducible = 0

  return {
    is_producible: maxProducible > 0,
    max_producible: maxProducible,
    bottleneck,
    missing,
  }
}
