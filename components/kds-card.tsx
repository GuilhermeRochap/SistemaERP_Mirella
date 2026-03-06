'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Clock, Play, Pause, CheckCircle, AlertTriangle, EyeOff, Zap, Package, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { calcularTempoInicioProducao } from '@/lib/route-optimizer';

interface KDSCardProps {
  pedido: any;
  onUpdate: () => void;
}

export function KDSCard({ pedido, onUpdate }: KDSCardProps) {
  // Timer local em segundos
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isLate, setIsLate] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const [isPausedLocally, setIsPausedLocally] = useState(false);

  // Inicializa o timer baseado no estado do pedido
  useEffect(() => {
    // Se o pedido foi finalizado no banco, sempre força atualização
    if (pedido?.statusProducao === 'Concluído' || pedido?.statusProducao === 'Aguardando Produção') {
      setIsPausedLocally(false);
    }

    // Se estivermos em pausa local, ignoramos a atualização que vem do banco
    // para não desfazer o nosso timer no front-end
    if (isPausedLocally) return;

    // Limpa intervalo anterior
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const tempoAcumulado = pedido?.tempoPausado || 0;

    if (pedido?.statusProducao === 'Em Produção') {
      // Se está em produção, calcula tempo desde o início + tempo já pausado anteriormente
      if (pedido?.inicioProducao) {
        const inicio = new Date(pedido.inicioProducao).getTime();
        const agora = Date.now();
        const tempoDesdeInicio = Math.floor((agora - inicio) / 1000);

        setSeconds(tempoAcumulado + tempoDesdeInicio);
        startTimeRef.current = inicio; // Guarda a referência do último início
      } else {
        setSeconds(tempoAcumulado);
        startTimeRef.current = Date.now();
      }
      setIsRunning(true);
    } else if (pedido?.statusProducao === 'Pausado') {
      // Pausa que veio do banco (histórico)
      setSeconds(tempoAcumulado);
      setIsRunning(false);
    } else {
      // Aguardando ou Concluído
      setSeconds(tempoAcumulado);
      setIsRunning(false);
    }
  }, [pedido?.id, pedido?.statusProducao, pedido?.inicioProducao, pedido?.tempoPausado, isPausedLocally]);

  // Timer que roda a cada segundo
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);

        // Verificar se está atrasado
        const horarioInicio = calcularTempoInicioProducao(
          pedido?.horaEntrega ?? '00:00',
          pedido?.tempoEstimadoProducao ?? 0
        );
        const [h, m] = (horarioInicio?.split?.(':') ?? ['0', '0'])?.map?.(Number);
        const horarioInicioDate = new Date(pedido?.dataEntrega);
        horarioInicioDate?.setHours?.(h, m, 0, 0);
        setIsLate(Date.now() > horarioInicioDate?.getTime?.());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, pedido?.horaEntrega, pedido?.tempoEstimadoProducao, pedido?.dataEntrega]);

  const formatTime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleAction = async (acao: string) => {
    try {
      if (acao === 'iniciar') {
        setIsRunning(true);
        setSeconds(0);
        setIsPausedLocally(false);
        startTimeRef.current = Date.now();
      } else if (acao === 'retomar') {
        setIsRunning(true);
        setIsPausedLocally(false);
        startTimeRef.current = Date.now();

        // Retomada 100% no cache local, não bate na API e não faz onUpdate
        return;
      } else if (acao === 'pausar') {
        setIsRunning(false);
        setIsPausedLocally(true);

        // Pausa 100% no cache local, não bate na API e não faz onUpdate
        return;
      } else if (acao === 'concluir') {
        setIsRunning(false);
        setIsPausedLocally(false);
      }

      // Envia a ação para o backend apenas para "iniciar" e "concluir"
      const payload: any = { pedidoId: pedido?.id, acao };

      if (acao === 'concluir') {
        payload.tempoDecorrido = seconds;
      }

      const response = await fetch('/api/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response?.ok) {
        if (acao === 'concluir') {
          toast.success('Pedido concluído!');
        } else {
          toast.success('Status atualizado!');
        }
        if (onUpdate) onUpdate();
      } else {
        toast.error('Erro ao salvar no banco');
        if (onUpdate) onUpdate();
      }
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast.error('Erro de comunicação');
      if (onUpdate) onUpdate();
    }
  };

  const handleFinalizar = async () => {
    if (!window.confirm('Deseja finalizar este pedido agora? Ele será movido para Entregue.')) return;

    try {
      const response = await fetch(`/api/pedidos/${pedido?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Entregue',
          statusProducao: 'Entregue'
        }),
      });

      if (response.ok) {
        toast.success('Pedido finalizado com sucesso!');
        if (onUpdate) onUpdate();
      } else {
        toast.error('Erro ao finalizar pedido.');
      }
    } catch (error) {
      console.error('Erro ao finalizar pedido:', error);
      toast.error('Erro de comunicação');
    }
  };

  const getStatusColor = () => {
    switch (pedido?.statusProducao) {
      case 'Aguardando Produção':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300';
      case 'Em Produção':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300';
      case 'Pausado':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300';
      case 'Concluído':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (pedido?.statusProducao) {
      case 'Aguardando Produção':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'Em Produção':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'Pausado':
        return <Pause className="w-5 h-5 text-orange-600" />;
      case 'Concluído':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return null;
    }
  };

  const horarioInicio = calcularTempoInicioProducao(
    pedido?.horaEntrega ?? '00:00',
    pedido?.tempoEstimadoProducao ?? 0
  );

  // Tags do pedido
  const renderTags = () => {
    const tags = [];

    if (pedido?.status === 'Urgente') {
      tags.push(
        <Badge key="urgente" className="bg-red-500 text-white flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Urgente
        </Badge>
      );
    }

    if (pedido?.pedidoAnonimo) {
      tags.push(
        <Badge key="anonimo" className="bg-purple-500 text-white flex items-center gap-1">
          <EyeOff className="w-3 h-3" />
          Anônimo
        </Badge>
      );
    }

    if (pedido?.origemPedido) {
      const origemColors: Record<string, string> = {
        'Site': 'bg-blue-500',
        'WhatsApp': 'bg-green-500',
        'Instagram': 'bg-pink-500',
        'Telefone': 'bg-gray-500',
        'Retirada': 'bg-amber-500',
      };
      tags.push(
        <Badge key="origem" className={`${origemColors[pedido.origemPedido] || 'bg-gray-500'} text-white`}>
          {pedido.origemPedido}
        </Badge>
      );
    }

    return tags;
  };

  const renderPeriodo = () => {
    if (!pedido?.horaEntrega) return null;

    const [hora] = pedido.horaEntrega.split(':').map(Number);
    if (isNaN(hora)) return null;

    if (hora >= 0 && hora < 12) {
      return (
        <Badge className="bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-transparent gap-1 px-3 py-1 text-sm font-bold shadow-sm">
          <Clock className="w-4 h-4" />
          Manhã
        </Badge>
      );
    } else if (hora >= 12 && hora < 18) {
      return (
        <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-transparent gap-1 px-3 py-1 text-sm font-bold shadow-sm">
          <Clock className="w-4 h-4" />
          Tarde
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white border-transparent gap-1 px-3 py-1 text-sm font-bold shadow-sm">
          <Clock className="w-4 h-4" />
          Noite
        </Badge>
      );
    }
  };

  return (
    <Card className={`${getStatusColor()} border-2 ${isLate && pedido?.statusProducao !== 'Concluído' ? 'ring-2 ring-red-500 animate-pulse' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-start justify-between">
          <div className="flex items-center gap-2 mt-1">
            {getStatusIcon()}
            <span className="text-lg font-bold">{pedido?.nomeRecebedor ?? 'Sem nome'}</span>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-xl font-mono font-black text-white bg-red-600 px-3 py-1 rounded-md shadow-sm border border-slate-700">
              #{pedido.id.slice(0, 8).toUpperCase()}
            </span>
            {renderPeriodo()}
          </div>
        </CardTitle>
        {/* Tags do pedido */}
        <div className="flex flex-wrap gap-1 mt-2">
          {renderTags()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Data do pedido */}
        {pedido?.dataEntrega && (
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Data de Entrega</p>
              <p className="font-bold text-sm capitalize">
                {new Date(pedido.dataEntrega).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Iniciar às:</p>
            <p className="font-semibold text-lg">{horarioInicio}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Entregar às:</p>
            <p className="font-semibold text-lg">{pedido?.horaEntrega ?? '00:00'}</p>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-muted-foreground text-sm mb-1">Tempo decorrido:</p>
          {pedido?.statusProducao === 'Aguardando Produção' ? (
            <p className="text-2xl font-mono font-bold text-muted-foreground">
              00:00:00
            </p>
          ) : pedido?.statusProducao === 'Concluído' ? (
            <div>
              <p className="text-2xl font-mono font-bold text-green-600">
                {formatTime(seconds)}
              </p>
              <p className="text-xs text-green-600 mt-1">✓ Concluído</p>
            </div>
          ) : pedido?.statusProducao === 'Pausado' ? (
            <div>
              <p className="text-2xl font-mono font-bold text-orange-600">
                {formatTime(seconds)}
              </p>
              <p className="text-xs text-orange-600 mt-1 animate-pulse">⏸ Pausado</p>
            </div>
          ) : (
            <p className={`text-3xl font-mono font-bold ${isLate ? 'text-red-600' : 'text-blue-600'}`}>
              {formatTime(seconds)}
            </p>
          )}
        </div>

        <div className="bg-card p-3 rounded-lg border">
          <p className="text-muted-foreground text-sm mb-1">Descrição:</p>
          <p className="text-sm">{pedido?.descricao ?? 'Sem descrição'}</p>
        </div>

        {/* Mensagem / Observação do pedido */}
        {pedido?.mensagemAnonima && (
          <div className={`p-3 rounded-lg border ${pedido?.pedidoAnonimo ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'}`}>
            <p className={`text-sm flex items-center gap-1 ${pedido?.pedidoAnonimo ? 'text-purple-700 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
              {pedido?.pedidoAnonimo ? <EyeOff className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
              &quot;{pedido.mensagemAnonima}&quot;
            </p>
          </div>
        )}

        <div className="flex gap-2">
          {pedido?.statusProducao === 'Aguardando Produção' && (
            <Button
              onClick={() => handleAction('iniciar')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Iniciar
            </Button>
          )}

          {pedido?.statusProducao === 'Em Produção' && (
            <>
              <Button
                onClick={() => handleAction('pausar')}
                className="flex-1"
                variant="secondary"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pausar
              </Button>
              <Button
                onClick={() => handleAction('concluir')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir
              </Button>
            </>
          )}

          {pedido?.statusProducao === 'Pausado' && (
            <Button
              onClick={() => handleAction('retomar')}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Retomar
            </Button>
          )}

          {pedido?.statusProducao === 'Concluído' && (
            <div className="flex flex-col gap-2 w-full">
              <div className="flex-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 text-center py-2 rounded-lg font-semibold border border-green-300 dark:border-green-700">
                ✓ Pronto para Entrega
              </div>
              <Button
                onClick={handleFinalizar}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Finalizar Pedido
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
