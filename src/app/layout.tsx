import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Gestionale',
  description: 'Gestione inventario, ordini e produzione',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '10px',
              background: '#fff',
              color: '#1f2937',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
