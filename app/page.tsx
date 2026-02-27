import { DashboardStats } from '@/components/dashboard-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-500">
          Sistema de Otimização de Rotas
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Gerencie seus pedidos, acompanhe a produção em tempo real e otimize suas entregas de forma inteligente.
        </p>
      </div>

      {/* Stats */}
      <DashboardStats />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/novo-pedido" className="group">
          <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-red-300 dark:hover:border-red-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <Package className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span>Novo Pedido</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Cadastre um novo pedido de entrega no sistema.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kds" className="group">
          <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-red-300 dark:hover:border-red-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <Clock className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span>KDS - Cozinha</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Acompanhe a produção dos pedidos em tempo real.</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/otimizador" className="group">
          <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-2 border-transparent hover:border-red-300 dark:hover:border-red-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                  <TrendingUp className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <span>Otimizar Rotas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Gere rotas otimizadas para suas entregas do dia.</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
