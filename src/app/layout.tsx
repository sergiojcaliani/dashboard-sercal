import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sercal - Controle Empresarial',
  description: 'Sistema de controle financeiro e administrativo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-100">
        <header className="bg-sercal-navy text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-white">Sercal</span>
              <span className="hidden sm:inline text-sm text-gray-300">Controle Empresarial</span>
            </div>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="hover:text-caliani-green transition">Dashboard</a>
              <a href="/lancamento" className="hover:text-caliani-green transition">Lançamento</a>
              <a href="/extrato" className="hover:text-caliani-green transition">Extrato</a>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}