'use client';

import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Package, Clock, Truck, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Stats {
  total: number;
  aguardando: number;
  emProducao: number;
  concluidos: number;
  emRota: number;
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    aguardando: 0,
    emProducao: 0,
    concluidos: 0,
    emRota: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const hoje = new Date()?.toISOString()?.split?.('T')?.[0];
        const response = await fetch(`/api/pedidos?data=${hoje}`);
        const pedidos = await response?.json?.();

        const newStats = {
          total: pedidos?.length ?? 0,
          aguardando: pedidos?.filter?.((p: any) => p?.statusProducao === 'Aguardando Produção')?.length ?? 0,
          emProducao: pedidos?.filter?.((p: any) => p?.statusProducao === 'Em Produção')?.length ?? 0,
          concluidos: pedidos?.filter?.((p: any) => p?.statusProducao === 'Concluído')?.length ?? 0,
          emRota: pedidos?.filter?.((p: any) => p?.statusProducao === 'Em Rota')?.length ?? 0,
        };

        setStats(newStats);
      } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Atualiza a cada 30s

    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      title: 'Total de Pedidos',
      value: stats?.total ?? 0,
      icon: Package,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      title: 'Aguardando',
      value: stats?.aguardando ?? 0,
      icon: Clock,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      title: 'Em Produção',
      value: stats?.emProducao ?? 0,
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      title: 'Concluídos',
      value: stats?.concluidos ?? 0,
      icon: CheckCircle,
      color: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      title: 'Em Rota',
      value: stats?.emRota ?? 0,
      icon: Truck,
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {statCards?.map?.((stat) => {
        const Icon = stat?.icon;
        return (
          <Card key={stat?.title} className="hover:shadow-xl transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat?.title}</p>
                  <p className="text-4xl font-bold">{stat?.value}</p>
                </div>
                <div className={`${stat?.bg} p-4 rounded-full`}>
                  <Icon className={`w-8 h-8 ${stat?.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
