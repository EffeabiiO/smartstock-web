# Business Logic

## Logica Ordini

### Creazione Ordine (client-side orchestration)

Per ogni riga dell'ordine:

1. **Allocazione stock**
   ```
   allocated = min(product.available_quantity, requested_quantity)
   to_produce = max(0, requested_quantity - allocated)
   ```

2. **Calcolo economico**
   ```
   revenue = selling_price × requested_quantity
   cost    = unit_cost × requested_quantity
   margin  = revenue - cost
   ```

3. **Al conferma ordine** (status = 'confermato'):
   - `products.available_quantity -= allocated`
   - Insert in `inventory_movements` (type: 'allocazione')
   - Se `to_produce > 0`: insert in `production_tasks` (status: 'in_attesa')
   - Insert in `audit_logs`

### Stati Ordine
```
bozza → confermato → in_produzione → completato
                                  ↘ annullato
```

---

## Logica Produzione

### Completamento Task

Quando un task passa a `completato`:
1. `products.available_quantity += task.quantity`
2. Insert `inventory_movements` (type: 'produzione', quantity positiva)
3. Insert `audit_logs`

### Stati Task
```
in_attesa → in_corso → completato
                    ↘ annullato
```

---

## Logica BOM e Producibilità

### Formula
```typescript
max_producible = min over all components of:
  floor(component.available_quantity / quantity_required)
```

### Bottleneck
Il componente con il valore più basso di `floor(disp / richiesto)`.

### Componenti Mancanti
Componenti per cui `available_quantity < quantity_required`.

### Implementazione (`src/lib/utils.ts → calculateProducibility`)
- Input: array di componenti con prodotto annidato
- Output: `{ is_producible, max_producible, bottleneck, missing[] }`
- Usato in: dettaglio prodotto, insights

---

## Rettifica Magazzino

| Tipo | Effetto |
|---|---|
| carico | `available += qty` |
| scarico | `available = max(0, available - qty)` |
| rettifica | `available = qty` (valore assoluto) |

Ogni rettifica crea un record in `inventory_movements` e `audit_logs`.

---

## Audit Log

Azioni tracciate:
- `product_created` / `product_updated` / `product_deleted`
- `stock_adjusted`
- `order_created_draft` / `order_created_confirmed`
- `order_status_changed`
- `production_task_created`
- `production_completed`
- `company_updated`

Payload: JSON con dati rilevanti per ogni azione.
