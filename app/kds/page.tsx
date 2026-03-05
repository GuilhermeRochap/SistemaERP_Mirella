'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { KDSCard } from '@/components/kds-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Volume2, VolumeX, Bell } from 'lucide-react';
import toast from 'react-hot-toast';

export default function KDSPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [periodoFilter, setPeriodoFilter] = useState<string>('all');
  const [somAtivo, setSomAtivo] = useState(true);
  const [novoPedido, setNovoPedido] = useState(false);
  const pedidosIdsRef = useRef<Set<string>>(new Set());


  const audioContextRef = useRef<AudioContext | null>(null);

  // Inicializar AudioContext após interação do usuário
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Retomar se estiver suspenso (política de autoplay)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, []);

  const tocarSomNotificacao = useCallback(() => {
    if (!somAtivo) return;
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;

      const playBeep = (freq: number, delay: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.5);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.5);
      };

      playBeep(880, 0);      // Nota A5
      playBeep(1046.5, 0.3); // Nota C6
    } catch (error) {
      console.error('Erro ao tocar som:', error);
    }
  }, [somAtivo]);

  const fetchPedidos = async () => {
    try {
      const response = await fetch('/api/kds');
      const data = await response?.json?.() ?? [];

      // Verificar se há novos pedidos
      const novosIds = data
        .filter((p: any) => !pedidosIdsRef.current.has(p.id))
        .map((p: any) => p.id);

      if (novosIds.length > 0 && pedidosIdsRef.current.size > 0) {
        // Há novos pedidos!
        setNovoPedido(true);
        tocarSomNotificacao();
        toast.success(`${novosIds.length} novo(s) pedido(s) chegou!`, {
          icon: '🔔',
          duration: 4000,
        });

        // Remover indicador após 3 segundos
        setTimeout(() => setNovoPedido(false), 3000);
      }

      // Atualizar ref com todos os IDs
      pedidosIdsRef.current = new Set(data.map((p: any) => p.id));
      setPedidos(data);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
    const interval = setInterval(fetchPedidos, 5000); // Auto-refresh a cada 5s
    return () => clearInterval(interval);
  }, []);

  const filteredPedidos = pedidos?.filter?.((p) => {
    // Filtro de Status
    if (filter !== 'all' && p?.statusProducao !== filter) {
      return false;
    }

    // Filtro de Período
    if (periodoFilter !== 'all') {
      if (!p?.horaEntrega) return false;
      const [hora] = p.horaEntrega.split(':').map(Number);
      if (isNaN(hora)) return false;

      if (periodoFilter === 'manha' && (hora < 0 || hora >= 12)) return false;
      if (periodoFilter === 'tarde' && (hora < 12 || hora >= 18)) return false;
      if (periodoFilter === 'noite' && (hora < 18)) return false;
    }

    return true;
  }) ?? [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-red-500 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r text-red-600 dark:text-red-500">
              KDS - Kitchen Display System
            </h1>
            <p className="text-muted-foreground mt-1">Acompanhe a produção dos pedidos em tempo real</p>
          </div>
          {novoPedido && (
            <Badge className="bg-green-500 text-white animate-pulse flex items-center gap-1">
              <Bell className="w-3 h-3" />
              Novo Pedido!
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              initAudioContext(); // <-- Desbloqueia o AudioContext com interação do usuário
              setSomAtivo(!somAtivo);
            }}
            variant="outline"
            size="sm"
            className={somAtivo ? 'text-green-600' : 'text-gray-400'}
            title={somAtivo ? 'Som ativado' : 'Som desativado'}
          >
            {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Button onClick={fetchPedidos} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col gap-3 pb-2">
        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Todos Status' },
            { value: 'Aguardando Produção', label: 'Aguardando' },
            { value: 'Em Produção', label: 'Em Produção' },
            { value: 'Pausado', label: 'Pausados' },
            { value: 'Concluído', label: 'Concluídos' },
          ]?.map?.((f) => (
            <Button
              key={f?.value}
              onClick={() => setFilter(f?.value ?? 'all')}
              variant={filter === f?.value ? 'default' : 'outline'}
              size="sm"
            >
              {f?.label}
            </Button>
          ))}
        </div>

        {/* Period Filters */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { value: 'all', label: 'Qualquer Período', colorClass: '' },
            { value: 'manha', label: 'Manhã', colorClass: periodoFilter === 'manha' ? 'bg-red-600 text-white hover:bg-red-500 border-transparent' : 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950' },
            { value: 'tarde', label: 'Tarde', colorClass: periodoFilter === 'tarde' ? 'bg-red-600 text-white hover:bg-red-500 border-transparent' : 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950' },
            { value: 'noite', label: 'Noite', colorClass: periodoFilter === 'noite' ? 'bg-red-600 text-white hover:bg-red-500 border-transparent' : 'border-red-400 text-red-600 hover:bg-red-50 dark:hover:bg-red-950' },
          ]?.map?.((f) => (
            <Button
              key={f?.value}
              onClick={() => setPeriodoFilter(f?.value)}
              variant={periodoFilter === f?.value && f.value === 'all' ? 'default' : 'outline'}
              size="sm"
              className={f.colorClass}
            >
              {f?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      {filteredPedidos?.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum pedido encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPedidos?.map?.((pedido) => (
            <KDSCard key={pedido?.id} pedido={pedido} onUpdate={fetchPedidos} />
          ))}
        </div>
      )}
    </div>
  );
}
