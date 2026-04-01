export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          created_at?: string
        }
      }
      company_memberships: {
        Row: {
          id: string
          user_id: string
          company_id: string
        }
        Insert: {
          id?: string
          user_id: string
          company_id: string
        }
        Update: {
          id?: string
          user_id?: string
          company_id?: string
        }
      }
      products: {
        Row: {
          id: string
          company_id: string
          name: string
          sku: string | null
          category: string | null
          available_quantity: number
          reserved_quantity: number
          minimum_stock: number
          unit_cost: number | null
          selling_price: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          sku?: string | null
          category?: string | null
          available_quantity?: number
          reserved_quantity?: number
          minimum_stock?: number
          unit_cost?: number | null
          selling_price?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          sku?: string | null
          category?: string | null
          available_quantity?: number
          reserved_quantity?: number
          minimum_stock?: number
          unit_cost?: number | null
          selling_price?: number | null
          created_at?: string
        }
      }
      product_components: {
        Row: {
          id: string
          parent_product_id: string
          component_product_id: string
          quantity_required: number
        }
        Insert: {
          id?: string
          parent_product_id: string
          component_product_id: string
          quantity_required: number
        }
        Update: {
          id?: string
          parent_product_id?: string
          component_product_id?: string
          quantity_required?: number
        }
      }
      orders: {
        Row: {
          id: string
          company_id: string
          customer_name: string | null
          status: string
          total_cost: number | null
          total_revenue: number | null
          total_margin: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          customer_name?: string | null
          status?: string
          total_cost?: number | null
          total_revenue?: number | null
          total_margin?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          customer_name?: string | null
          status?: string
          total_cost?: number | null
          total_revenue?: number | null
          total_margin?: number | null
          created_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          requested_quantity: number | null
          allocated_quantity: number | null
          quantity_to_produce: number | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          requested_quantity?: number | null
          allocated_quantity?: number | null
          quantity_to_produce?: number | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          requested_quantity?: number | null
          allocated_quantity?: number | null
          quantity_to_produce?: number | null
        }
      }
      production_tasks: {
        Row: {
          id: string
          company_id: string
          product_id: string
          quantity: number
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          product_id: string
          quantity: number
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string
          quantity?: number
          status?: string
          created_at?: string
        }
      }
      inventory_movements: {
        Row: {
          id: string
          company_id: string
          product_id: string
          type: string
          quantity: number
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          product_id: string
          type: string
          quantity: number
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          product_id?: string
          type?: string
          quantity?: number
          note?: string | null
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          company_id: string
          action: string
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id: string
          action: string
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          company_id?: string
          action?: string
          payload?: Json | null
          created_at?: string
        }
      }
    }
    Functions: {
      user_company_ids: {
        Args: Record<string, never>
        Returns: string[]
      }
      create_company_with_membership: {
        Args: { company_name: string; company_logo_url?: string | null }
        Returns: string
      }
    }
  }
}

// App-level types
export type Company = Database['public']['Tables']['companies']['Row']
export type Product = Database['public']['Tables']['products']['Row']
export type ProductComponent = Database['public']['Tables']['product_components']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderItem = Database['public']['Tables']['order_items']['Row']
export type ProductionTask = Database['public']['Tables']['production_tasks']['Row']
export type InventoryMovement = Database['public']['Tables']['inventory_movements']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type OrderStatus = 'bozza' | 'confermato' | 'in_produzione' | 'completato' | 'annullato'
export type ProductionStatus = 'in_attesa' | 'in_corso' | 'completato' | 'annullato'
export type MovementType = 'carico' | 'scarico' | 'allocazione' | 'produzione' | 'rettifica'

export interface ProductWithComponents extends Product {
  components: (ProductComponent & { component: Product })[]
  used_in: (ProductComponent & { parent: Product })[]
}

export interface ProducibilityInfo {
  is_producible: boolean
  max_producible: number
  bottleneck: { product: Product; available: number; required: number } | null
  missing: { product: Product; missing_quantity: number }[]
}

export interface OrderItemWithProduct extends OrderItem {
  product: Product
}

export interface OrderWithItems extends Order {
  order_items: OrderItemWithProduct[]
}

export interface ProductionTaskWithProduct extends ProductionTask {
  product: Product
}

export interface DashboardStats {
  active_orders: number
  total_revenue_month: number
  active_production_tasks: number
  low_stock_products: number
}
