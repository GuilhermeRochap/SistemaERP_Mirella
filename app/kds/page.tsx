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
  const [somAtivo, setSomAtivo] = useState(true);
  const [novoPedido, setNovoPedido] = useState(false);
  const pedidosIdsRef = useRef<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Criar áudio de notificação
  useEffect(() => {
    // Criar um som de notificação usando Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // Nota A5
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      // Segundo beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.setValueAtTime(1046.5, audioContext.currentTime); // Nota C6
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.5);
      }, 200);
    };

    // Armazenar a função para uso posterior
    (window as any).playNotificationSound = createNotificationSound;
  }, []);

  const tocarSomNotificacao = useCallback(() => {
    if (!somAtivo) return;
    try {
      if ((window as any).playNotificationSound) {
        (window as any).playNotificationSound();
      }
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
    if (filter === 'all') return true;
    return p?.statusProducao === filter;
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
            onClick={() => setSomAtivo(!somAtivo)}
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

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { value: 'all', label: 'Todos' },
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
