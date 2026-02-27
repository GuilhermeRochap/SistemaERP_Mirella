import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { Home, Package, Monitor, Settings, Truck, Wand2, BarChart3 } from 'lucide-react';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { EnvironmentBadge } from '@/components/environment-badge';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: 'Mirella Doces - Sistema de Rotas',
  description: 'Sistema otimizador de rotas para delivery da Mirella Doces',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Mirella Doces - Sistema de Rotas',
    description: 'Sistema otimizador de rotas para delivery da Mirella Doces',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full bg-red-600 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
                      <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-white">
                          Mirella Doces
                        </h1>
                        <p className="text-xs text-red-100">Sistema de Rotas</p>
                      </div>
                    </Link>
                    <EnvironmentBadge />
                  </div>

                  <nav className="flex items-center gap-1">
                    <Link
                      href="/"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Home className="w-4 h-4" />
                      <span className="hidden md:inline">Dashboard</span>
                    </Link>
                    <Link
                      href="/pedidos"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Package className="w-4 h-4" />
                      <span className="hidden md:inline">Pedidos</span>
                    </Link>
                    <Link
                      href="/kds"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Monitor className="w-4 h-4" />
                      <span className="hidden md:inline">KDS</span>
                    </Link>
                    <Link
                      href="/otimizador"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      <span className="hidden md:inline">Otimizador</span>
                    </Link>
                    <Link
                      href="/rotas"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Truck className="w-4 h-4" />
                      <span className="hidden md:inline">Rotas</span>
                    </Link>
                    <Link
                      href="/relatorio-frete"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span className="hidden md:inline">Relatório</span>
                    </Link>
                    <Link
                      href="/configuracoes"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-white text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden md:inline">Config</span>
                    </Link>
                    <div className="ml-2 border-l border-red-500 pl-2">
                      <ThemeToggle />
                    </div>
                  </nav>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
          <Toaster position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
