# Setup Supabase

## Tabelle Utilizzate

Il progetto usa le tabelle esistenti senza modifiche allo schema.

| Tabella | Utilizzo |
|---|---|
| `companies` | Dati azienda (nome, logo) |
| `company_memberships` | Associazione utente ↔ azienda |
| `products` | Prodotti, componenti, materie prime |
| `product_components` | Distinta base (BOM) |
| `orders` | Testata ordini clienti |
| `order_items` | Righe ordine con allocazione |
| `production_tasks` | Task di produzione |
| `inventory_movements` | Movimenti magazzino (log) |
| `audit_logs` | Log operazioni business |

## Funzioni RPC Utilizzate

```sql
-- Crea azienda e associa l'utente corrente
create_company_with_membership(company_name text, company_logo_url text)

-- Restituisce gli ID aziende dell'utente corrente (usato internamente da RLS)
user_company_ids()
```

## Storage

Bucket richiesto: `company-assets`

Creare il bucket in Supabase Dashboard → Storage:
- Nome: `company-assets`
- Tipo: **Public** (per URL logo pubblici)
- Policy: permettere upload agli utenti autenticati

```sql
-- Policy upload per utenti autenticati
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'company-assets');

-- Policy lettura pubblica
CREATE POLICY "Public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'company-assets');
```

## RLS

RLS è già configurato. Il client usa la `anon key` con sessione autenticata — Supabase applica automaticamente le policy per filtrare i dati dell'utente corrente.

## Estensioni Schema

**Nessuna estensione necessaria.** Il progetto usa interamente lo schema esistente.

Se in futuro si volesse aggiungere una funzione transazionale per la creazione ordini (per atomicità garantita lato DB), si potrebbe aggiungere:

```sql
-- Opzionale: funzione RPC per order creation atomica
CREATE OR REPLACE FUNCTION process_order(...)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
-- logica ordine in una singola transazione
$$;
```

Attualmente l'orchestrazione è client-side (sequenza di chiamate Supabase).
