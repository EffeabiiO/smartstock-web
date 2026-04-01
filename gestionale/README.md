# Gestionale — Business Management Web App

Web app completa per la gestione di inventario, ordini, produzione e distinte base. Costruita con Next.js 14, TypeScript, Tailwind CSS e Supabase.

---

## Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend / Auth / DB**: Supabase (Auth + PostgreSQL + Storage)
- **Charts**: Recharts
- **Icons**: Lucide React
- **Deploy**: Cloudflare Pages

---

## Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

> Su Cloudflare Pages, aggiungi le stesse variabili nel pannello **Settings → Environment variables**.

---

## Avvio Locale

```bash
# 1. Installa dipendenze
npm install

# 2. Configura le env vars
cp .env.local.example .env.local
# Edita .env.local con le tue credenziali Supabase

# 3. Avvia il dev server
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

---

## Deploy su Cloudflare Pages

1. Connetti il repository GitHub al tuo progetto Cloudflare Pages
2. Imposta il **Build command**: `npm run build`
3. Imposta l'**Output directory**: `.next`
4. Aggiungi le variabili d'ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Fai push del codice → il deploy parte automaticamente

> **Nota**: Il progetto usa Next.js standard (non edge runtime), compatibile con Cloudflare Pages tramite il preset `@cloudflare/next-on-pages` se necessario. Per deploy semplice, il build Next.js standard è sufficiente con Cloudflare Pages.

---

## Struttura Progetto

```
src/
├── app/
│   ├── (auth)/          # Login, Signup
│   ├── (onboarding)/    # Creazione prima azienda
│   ├── (protected)/     # Tutte le pagine autenticate
│   │   ├── dashboard/
│   │   ├── inventario/
│   │   ├── ordini/
│   │   ├── produzione/
│   │   ├── insights/
│   │   ├── impostazioni/
│   │   └── account/
│   ├── globals.css
│   └── layout.tsx
├── components/
│   └── forms/           # Modal forms riutilizzabili
├── hooks/
│   └── useCompany.tsx   # Context multi-azienda
├── lib/
│   ├── supabase/        # Client browser + server
│   └── utils.ts         # Helpers, formatters, logica BOM
├── middleware.ts         # Auth guard
└── types/
    └── index.ts         # Tipi TypeScript dal schema Supabase
```

---

## Funzionalità Implementate

### Autenticazione
- Sign in / Sign up / Sign out
- Sessione persistente via Supabase Auth
- Route protection con middleware Next.js

### Multi-Azienda
- Ogni utente può creare e gestire più aziende
- Switcher azienda nella sidebar e header mobile
- Dati completamente isolati per azienda (RLS Supabase)

### Inventario
- Lista prodotti con ricerca, filtri per categoria e stato scorte
- Scheda prodotto con dettaglio completo
- Crea / modifica / elimina prodotti
- Rettifica magazzino (carico, scarico, rettifica assoluta) con movement log

### Distinta Base (BOM)
- Ogni prodotto può avere componenti
- Aggiunta / rimozione componenti
- Visualizzazione "utilizzato in"
- **Calcolo producibilità in tempo reale**:
  - Max producibile: `min(floor(disponibile / richiesto))`
  - Collo di bottiglia
  - Componenti mancanti

### Ordini
- Lista ordini con filtri per stato
- Creazione ordine con:
  - Allocazione automatica da stock disponibile
  - Calcolo quantità da produrre
  - Preview ricavo / costo / margine per riga e totale
  - Creazione automatica production task se stock insufficiente
  - Aggiornamento stock e inventory movement al conferma
- Dettaglio ordine con avanzamento stato
- Audit log su ogni operazione

### Produzione
- Lista task di produzione con filtri
- Creazione task manuale
- Avanzamento stato: In Attesa → In Corso → Completato
- **Al completamento**: aggiornamento automatico stock + inventory movement + audit log

### Insights
- Prodotti esauriti
- Prodotti con scorta bassa (con barra visiva)
- Analisi producibilità per tutti i prodotti con BOM
- Colli di bottiglia e componenti mancanti

### Impostazioni
- Modifica nome e logo azienda
- Switcher tra aziende
- Tema: Chiaro / Scuro / Sistema

### Account
- Visualizzazione dati account
- Cambio password
- Logout
