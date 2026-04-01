# Architettura del Progetto

## Overview

Applicazione web full-stack per la gestione aziendale (inventario, ordini, produzione, distinte base).

## Stack Tecnologico

| Layer | Tecnologia |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS con design system custom |
| Auth | Supabase Auth (email/password) |
| Database | Supabase PostgreSQL con RLS |
| Storage | Supabase Storage (logo aziende) |
| Charts | Recharts |
| Deploy | Cloudflare Pages |

## Pattern Architetturali

### Route Groups (Next.js App Router)
```
(auth)       → Pagine pubbliche: login, signup
(onboarding) → Creazione prima azienda
(protected)  → Tutte le pagine che richiedono autenticazione
```

### Auth Flow
1. Middleware (`src/middleware.ts`) intercetta ogni richiesta
2. Verifica sessione Supabase
3. Redirect a `/login` se non autenticato
4. Redirect a `/dashboard` se già autenticato e tenta accesso a `/login`

### Multi-Company
- Context `useCompany` (React Context + localStorage)
- `activeCompanyId` persistito in localStorage
- Ogni query al DB filtra per `company_id`
- RLS Supabase garantisce isolamento lato server

### Client vs Server Components
- Tutte le pagine sono **Client Components** (`'use client'`)
- Fetching dati direttamente con Supabase browser client
- Il server client (`src/lib/supabase/server.ts`) è disponibile per future API routes

## Struttura Directory

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx       # Layout pagine auth
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (onboarding)/
│   │   └── onboarding/page.tsx
│   ├── (protected)/
│   │   ├── layout.tsx       # Layout principale: sidebar + bottom nav
│   │   ├── dashboard/page.tsx
│   │   ├── inventario/
│   │   │   ├── page.tsx     # Lista prodotti
│   │   │   └── [id]/page.tsx # Dettaglio prodotto + BOM
│   │   ├── ordini/
│   │   │   ├── page.tsx     # Lista ordini
│   │   │   ├── nuovo/page.tsx # Creazione ordine
│   │   │   └── [id]/page.tsx  # Dettaglio ordine
│   │   ├── produzione/page.tsx
│   │   ├── insights/page.tsx
│   │   ├── impostazioni/page.tsx
│   │   └── account/page.tsx
│   ├── globals.css
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Redirect a /dashboard
├── components/
│   └── forms/               # Modal components riutilizzabili
├── hooks/
│   └── useCompany.tsx       # Context provider multi-azienda
├── lib/
│   ├── supabase/
│   │   ├── client.ts        # Browser client
│   │   └── server.ts        # Server client
│   └── utils.ts             # Utilities, formatters, BOM logic
├── middleware.ts
└── types/
    └── index.ts             # TypeScript types dal schema DB
```
