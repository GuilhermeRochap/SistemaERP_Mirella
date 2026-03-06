'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';

// Importar Leaflet dinamicamente para evitar SSR
const MapaLeaflet = dynamic(() => import('@/components/mapa-leaflet'), {
  ssr: false,
  loading: () => <div className="h-[250px] bg-muted animate-pulse rounded-lg" />
});
import {
  Truck, Package, MapPin, Clock, RefreshCw, Bike, Car, DollarSign,
  Loader2, Phone, User, Hash, ExternalLink, CheckCircle, XCircle,
  AlertTriangle, Navigation, Calendar, Filter, Eye, Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface Pedido {
  id: string;
  nomeRecebedor: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  telefone: string;
  horaEntrega: string;
  peso: number;
  latitude: number | null;
  longitude: number | null;
}

interface Rota {
  id: string;
  data: string;
  tipoVeiculo: string;
  pesoTotal: number;
  distanciaTotal: number | null;
  tempoEstimadoTotal: number | null;
  status: string;
  lalamoveOrderId: string | null;
  lalamoveStatus: string | null;
  lalamoveShareLink: string | null;
  lalamoveServiceType: string | null;
  lalamovePrice: number | null;
  lalamoveDriverName: string | null;
  lalamoveDriverPhone: string | null;
  lalamovePlateNumber: string | null;
  lalamoveChamadoEm: string | null;
  pedidos: Pedido[];
  createdAt: string;
}

interface Cotacao {
  serviceType: string;
  quotationId: string;
  preco: string;
  expiresAt: string;
  priceFormatted?: string;
}

interface Configuracao {
  latitude: number | null;
  longitude: number | null;
  endereco: string | null;
  numero: string | null;
  bairro: string | null;
  cidade: string | null;
}

// Mapeamento de status para descrições amigáveis
const STATUS_DESCRICOES: Record<string, string> = {
  'ASSIGNING_DRIVER': 'Buscando motorista...',
  'ON_GOING': 'Motorista a caminho da coleta',
  'PICKED_UP': 'Encomenda coletada, em entrega',
  'COMPLETED': 'Entrega concluída',
  'CANCELED': 'Cancelado',
  'REJECTED': 'Rejeitado',
  'EXPIRED': 'Expirado'
};

export default function RotasPage() {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<string>('all');
  const [filtroData, setFiltroData] = useState<string>('');
  const [config, setConfig] = useState<Configuracao | null>(null);

  // Estados do modal de chamar veículo
  const [modalAberto, setModalAberto] = useState(false);
  const [rotaSelecionada, setRotaSelecionada] = useState<Rota | null>(null);
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [loadingCotacao, setLoadingCotacao] = useState(false);
  const [cotacaoSelecionada, setCotacaoSelecionada] = useState<Cotacao | null>(null);
  const [chamandoVeiculo, setChamandoVeiculo] = useState(false);

  // Estados do modal de detalhes
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [rotaDetalhes, setRotaDetalhes] = useState<Rota | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Estado para cancelamento de rota
  const [cancelandoRota, setCancelendoRota] = useState<string | null>(null);

  // Aba ativa: 'ativas' ou 'historico'
  const [abaAtiva, setAbaAtiva] = useState<'ativas' | 'historico'>('ativas');

  // Ref para armazenar os status anteriores (para detectar mudanças)
  const statusAnteriorRef = useRef<Record<string, string | null>>({});

  useEffect(() => {
    carregarRotas();
    carregarConfiguracao();
  }, []);

  const carregarConfiguracao = async () => {
    try {
      const response = await fetch('/api/configuracao');
      if (response?.ok) {
        const data = await response?.json?.();
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  const carregarRotas = async () => {
    setLoading(true);
    try {
      let url = '/api/rotas?';
      if (filtroData) url += `data=${filtroData}&`;
      if (filtroStatus !== 'all') url += `status=${filtroStatus}`;

      const response = await fetch(url);
      if (response?.ok) {
        const data = await response?.json?.();
        setRotas(data ?? []);
      } else {
        toast.error('Erro ao carregar rotas');
      }
    } catch (error) {
      console.error('Erro ao carregar rotas:', error);
      toast.error('Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar status de uma rota específica
  const atualizarStatusRota = useCallback(async (rotaId: string): Promise<{ novoStatus: string | null, motorista: string | null } | null> => {
    try {
      const response = await fetch(`/api/rotas/${rotaId}/status-lalamove`);
      if (response?.ok) {
        const data = await response?.json?.();
        return {
          novoStatus: data?.status ?? null,
          motorista: data?.motorista?.name ?? null
        };
      }
    } catch (error) {
      console.error(`Erro ao atualizar status da rota ${rotaId}:`, error);
    }
    return null;
  }, []);

  // Polling para atualização em tempo real
  useEffect(() => {
    const rotasAtivas = rotas.filter(r =>
      r.lalamoveOrderId &&
      r.lalamoveStatus &&
      !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(r.lalamoveStatus)
    );

    if (rotasAtivas.length === 0) return;

    const intervalo = setInterval(async () => {
      let houveAtualizacao = false;

      for (const rota of rotasAtivas) {
        const resultado = await atualizarStatusRota(rota.id);
        if (resultado && resultado.novoStatus) {
          const statusAnterior = statusAnteriorRef.current[rota.id];

          // Se o status mudou, mostrar notificação
          if (statusAnterior && statusAnterior !== resultado.novoStatus) {
            const descricao = STATUS_DESCRICOES[resultado.novoStatus] || resultado.novoStatus;

            if (resultado.novoStatus === 'ON_GOING' && resultado.motorista) {
              toast.success(`🚗 Motorista ${resultado.motorista} encontrado! Indo buscar a encomenda.`, { duration: 5000 });
            } else if (resultado.novoStatus === 'PICKED_UP') {
              toast.success(`📦 Encomenda coletada! Entrega em andamento.`, { duration: 5000 });
            } else if (resultado.novoStatus === 'COMPLETED') {
              toast.success(`✅ Entrega concluída com sucesso!`, { duration: 5000 });
            } else {
              toast(`Status atualizado: ${descricao}`, { icon: '🔄' });
            }

            houveAtualizacao = true;
          }

          statusAnteriorRef.current[rota.id] = resultado.novoStatus;
        }
      }

      // Recarregar a lista se houve atualização
      if (houveAtualizacao) {
        carregarRotas();
      }
    }, 8000); // Polling a cada 8 segundos

    return () => clearInterval(intervalo);
  }, [rotas, atualizarStatusRota]);

  // Inicializar os status anteriores quando as rotas são carregadas
  useEffect(() => {
    rotas.forEach(rota => {
      if (rota.lalamoveOrderId && !(rota.id in statusAnteriorRef.current)) {
        statusAnteriorRef.current[rota.id] = rota.lalamoveStatus;
      }
    });
  }, [rotas]);

  useEffect(() => {
    carregarRotas();
  }, [filtroStatus, filtroData]);

  const abrirModalChamarVeiculo = async (rota: Rota) => {
    setRotaSelecionada(rota);
    setModalAberto(true);
    setCotacaoSelecionada(null);
    setCotacoes([]);
    setLoadingCotacao(true);

    try {
      const response = await fetch(`/api/rotas/${rota.id}/cotacao`);
      if (response?.ok) {
        const data = await response?.json?.();
        // A API retorna { rotaId, pesoTotal, qtdPedidos, cotacoes }
        setCotacoes(data?.cotacoes ?? []);
      } else {
        const error = await response?.json?.();
        toast.error(error?.error ?? 'Erro ao buscar cotações');
      }
    } catch (error) {
      console.error('Erro ao buscar cotações:', error);
      toast.error('Erro ao buscar cotações');
    } finally {
      setLoadingCotacao(false);
    }
  };

  const chamarVeiculo = async () => {
    if (!rotaSelecionada || !cotacaoSelecionada) return;

    setChamandoVeiculo(true);
    try {
      const response = await fetch(`/api/rotas/${rotaSelecionada.id}/chamar-veiculo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: cotacaoSelecionada.serviceType,
        }),
      });

      if (response?.ok) {
        toast.success('Veículo chamado com sucesso!');
        setModalAberto(false);
        carregarRotas();
      } else {
        const error = await response?.json?.();
        toast.error(error?.error ?? 'Erro ao chamar veículo');
      }
    } catch (error) {
      console.error('Erro ao chamar veículo:', error);
      toast.error('Erro ao chamar veículo');
    } finally {
      setChamandoVeiculo(false);
    }
  };

  const cancelarRota = async (rotaId: string) => {
    if (!window.confirm('Deseja cancelar esta rota? Os pedidos voltarão ao Otimizador para uma nova rota.'))
      return;
    setCancelendoRota(rotaId);
    try {
      const response = await fetch(`/api/rotas/${rotaId}/cancelar`, { method: 'POST' });
      if (response.ok) {
        toast.success('Rota cancelada! Os pedidos voltaram ao Otimizador.');
        carregarRotas();
      } else {
        const err = await response.json();
        toast.error(err?.error ?? 'Erro ao cancelar rota');
      }
    } catch {
      toast.error('Erro ao cancelar rota');
    } finally {
      setCancelendoRota(null);
    }
  };

  const abrirDetalhes = async (rota: Rota) => {
    setRotaDetalhes(rota);
    setModalDetalhes(true);

    // Se tem pedido Lalamove, atualizar status
    if (rota.lalamoveOrderId) {
      await atualizarStatusLalamove(rota.id);
    }
  };

  const atualizarStatusLalamove = async (rotaId: string) => {
    setLoadingStatus(true);
    try {
      const response = await fetch(`/api/rotas/${rotaId}/status-lalamove`);
      if (response?.ok) {
        const data = await response?.json?.();
        // Atualizar rota nos detalhes
        setRotaDetalhes(prev => prev ? {
          ...prev,
          lalamoveStatus: data.status,
          lalamoveDriverName: data.motorista?.nome,
          lalamoveDriverPhone: data.motorista?.telefone,
          lalamovePlateNumber: data.motorista?.placa,
          lalamoveShareLink: data.shareLink,
        } : null);
        // Atualizar lista
        carregarRotas();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const getVehicleIcon = (tipo: string) => {
    switch (tipo) {
      case 'Moto':
      case 'LALAGO':
        return <Bike className="w-5 h-5" />;
      case 'Carro':
      case 'CAR':
      case 'HATCHBACK':
        return <Car className="w-5 h-5" />;
      default:
        return <Truck className="w-5 h-5" />;
    }
  };

  const getVehicleColor = (tipo: string) => {
    switch (tipo) {
      case 'Moto':
      case 'LALAGO':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 border-yellow-300';
      case 'Carro':
      case 'CAR':
      case 'HATCHBACK':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 border-blue-300';
      default:
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 border-red-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planejada':
        return 'bg-yellow-100 text-yellow-800';
      case 'Em Andamento':
        return 'bg-blue-100 text-blue-800';
      case 'Concluída':
        return 'bg-green-100 text-green-800';
      case 'Cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLalamoveStatusInfo = (status: string | null) => {
    switch (status) {
      case 'ASSIGNING_DRIVER':
        return { text: 'Buscando Motorista', color: 'text-yellow-600', icon: <Loader2 className="w-4 h-4 animate-spin" /> };
      case 'ON_GOING':
        return { text: 'A caminho da coleta', color: 'text-blue-600', icon: <Navigation className="w-4 h-4" /> };
      case 'PICKED_UP':
        return { text: 'Coletado - Em entrega', color: 'text-purple-600', icon: <Truck className="w-4 h-4" /> };
      case 'COMPLETED':
        return { text: 'Entregue', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
      case 'CANCELED':
      case 'REJECTED':
        return { text: 'Cancelado', color: 'text-red-600', icon: <XCircle className="w-4 h-4" /> };
      default:
        return { text: status ?? 'Aguardando', color: 'text-gray-600', icon: <Clock className="w-4 h-4" /> };
    }
  };

  const getVehicleName = (serviceType: string) => {
    switch (serviceType) {
      case 'LALAGO': return 'Moto';
      case 'CAR': return 'Carro';
      case 'HATCHBACK': return 'Hatchback';
      case 'VAN': return 'Van';
      case 'UV_FIORINO': return 'Fiorino';
      case 'TRUCK330': return 'Caminhão';
      default: return serviceType;
    }
  };

  // Verificar se há rotas sendo monitoradas
  const rotasMonitoradas = rotas.filter(r =>
    r.lalamoveOrderId &&
    r.lalamoveStatus &&
    !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(r.lalamoveStatus)
  );

  // Separar rotas por aba
  const rotasAtivas = rotas.filter(r => !['Concluída', 'Cancelada'].includes(r.status));
  const rotasHistorico = rotas.filter(r => ['Concluída', 'Cancelada'].includes(r.status));
  const rotasExibidas = abaAtiva === 'ativas' ? rotasAtivas : rotasHistorico;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
          Gerenciar Rotas
        </h1>
        <p className="text-muted-foreground">
          Visualize todas as rotas, acompanhe status e chame veículos Lalamove
        </p>
        {rotasMonitoradas.length > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
            </span>
            Monitorando {rotasMonitoradas.length} rota(s) em tempo real
          </div>
        )}
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-red-500" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <select
                className="w-full mt-1 border rounded-lg p-2 bg-background"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="Planejada">Planejada</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Concluída">Concluída</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={carregarRotas} variant="outline" className="w-full">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abas Ativas / Histórico */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setAbaAtiva('ativas')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${abaAtiva === 'ativas'
            ? 'bg-background border border-b-background border-border text-red-600 -mb-px'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <Radio className="w-4 h-4" />
          Em Andamento
          {rotasAtivas.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${abaAtiva === 'ativas' ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'
              }`}>{rotasAtivas.length}</span>
          )}
        </button>
        <button
          onClick={() => setAbaAtiva('historico')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg transition-colors flex items-center gap-2 ${abaAtiva === 'historico'
            ? 'bg-background border border-b-background border-border text-green-600 -mb-px'
            : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          <CheckCircle className="w-4 h-4" />
          Histórico / Concluídas
          {rotasHistorico.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${abaAtiva === 'historico' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
              }`}>{rotasHistorico.length}</span>
          )}
        </button>
      </div>

      {/* Lista de Rotas */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-red-500" />
          <p className="mt-4 text-muted-foreground">Carregando rotas...</p>
        </div>
      ) : rotasExibidas.length === 0 ? (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
          <p className="mt-4 text-muted-foreground">
            {abaAtiva === 'ativas' ? 'Nenhuma rota ativa no momento' : 'Nenhuma rota concluída ou cancelada'}
          </p>
          {abaAtiva === 'ativas' && (
            <p className="text-sm text-muted-foreground">Crie rotas no Otimizador</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {rotasExibidas.map((rota) => {
            const statusLalamove = getLalamoveStatusInfo(rota.lalamoveStatus);

            return (
              <Card key={rota.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg border-2 ${getVehicleColor(rota.lalamoveServiceType ?? rota.tipoVeiculo)}`}>
                        {getVehicleIcon(rota.lalamoveServiceType ?? rota.tipoVeiculo)}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          Rota #{rota.id.slice(0, 8)}
                          <Badge className={getStatusColor(rota.status)}>
                            {rota.status}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {rota.tipoVeiculo} • {rota.pedidos.length} pedido(s) • {rota.pesoTotal.toFixed(1)} kg
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-3 h-3" />
                          Criada em: {format(new Date(rota.createdAt), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Lalamove */}
                      {rota.lalamoveOrderId && (
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-gray-800 border ${statusLalamove.color}`}>
                          {statusLalamove.icon}
                          <span className="text-sm font-medium">{statusLalamove.text}</span>
                        </div>
                      )}

                      {/* Botões de ação */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDetalhes(rota)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Detalhes
                      </Button>

                      {!rota.lalamoveOrderId && rota.status === 'Planejada' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => abrirModalChamarVeiculo(rota)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            <Truck className="w-4 h-4 mr-2" />
                            Chamar Veículo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelarRota(rota.id)}
                            disabled={cancelandoRota === rota.id}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {cancelandoRota === rota.id ? 'Cancelando...' : 'Cancelar Rota'}
                          </Button>
                        </>
                      )}

                      {rota.lalamoveShareLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(rota.lalamoveShareLink!, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Rastrear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Métricas */}
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm">Distância</span>
                      </div>
                      <p className="text-xl font-bold">{rota.distanciaTotal?.toFixed(1) ?? '0'} km</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Tempo Est.</span>
                      </div>
                      <p className="text-xl font-bold">{rota.tempoEstimadoTotal ?? '0'} min</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-2 text-muted-foreground mb-1">
                        <Package className="w-4 h-4" />
                        <span className="text-sm">Entregas</span>
                      </div>
                      <p className="text-xl font-bold">{rota.pedidos.length}</p>
                    </div>
                    {rota.lalamovePrice && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-green-700 mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-sm">Valor</span>
                        </div>
                        <p className="text-xl font-bold text-green-700">
                          R$ {rota.lalamovePrice.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Info do motorista */}
                  {rota.lalamoveDriverName && (
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm font-semibold text-blue-800 mb-2">Motorista:</p>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2 text-blue-700">
                          <User className="w-4 h-4" />
                          <span>{rota.lalamoveDriverName}</span>
                        </div>
                        {rota.lalamoveDriverPhone && (
                          <div className="flex items-center gap-2 text-blue-700">
                            <Phone className="w-4 h-4" />
                            <span>{rota.lalamoveDriverPhone}</span>
                          </div>
                        )}
                        {rota.lalamovePlateNumber && (
                          <div className="flex items-center gap-2 text-blue-700">
                            <Hash className="w-4 h-4" />
                            <span>{rota.lalamovePlateNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Link de rastreamento */}
                  {rota.lalamoveShareLink && (
                    <a
                      href={rota.lalamoveShareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 transition-colors"
                    >
                      <Navigation className="w-4 h-4" />
                      <span className="font-medium text-sm">Rastrear entrega em tempo real</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {/* Lista resumida de pedidos */}
                  <div className="mt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Destinos:</p>
                    <div className="flex flex-wrap gap-2">
                      {rota.pedidos.slice(0, 5).map((pedido, idx) => (
                        <Badge key={pedido.id} variant="outline" className="text-xs">
                          {idx + 1}. {pedido.nomeRecebedor} - {pedido.bairro}
                        </Badge>
                      ))}
                      {rota.pedidos.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{rota.pedidos.length - 5} mais
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Chamar Veículo */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Truck className="w-5 h-5 text-orange-500" />
              Chamar Veículo
            </DialogTitle>
          </DialogHeader>

          {rotaSelecionada && (
            <div className="space-y-3">
              <div className="bg-muted rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Rota #{rotaSelecionada.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {rotaSelecionada.pedidos.length} pedido(s) • {rotaSelecionada.pesoTotal.toFixed(1)} kg
                  </p>
                </div>
                <Badge variant="outline">{rotaSelecionada.tipoVeiculo}</Badge>
              </div>

              {/* Cotações */}
              {loadingCotacao ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500" />
                  <p className="mt-1 text-sm text-muted-foreground">Buscando cotações...</p>
                </div>
              ) : cotacoes.length === 0 ? (
                <div className="text-center py-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-6 h-6 mx-auto text-red-500" />
                  <p className="mt-1 text-sm text-red-700">Nenhuma cotação disponível</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cotacoes.map((cotacao) => (
                    <div
                      key={cotacao.quotationId}
                      onClick={() => setCotacaoSelecionada(cotacao)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between ${cotacaoSelecionada?.quotationId === cotacao.quotationId
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-400'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getVehicleColor(cotacao.serviceType)}`}>
                          {getVehicleIcon(cotacao.serviceType)}
                        </div>
                        <span className="font-medium text-sm">{getVehicleName(cotacao.serviceType)}</span>
                      </div>
                      <span className="text-lg font-bold text-orange-600">{cotacao.preco}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={chamarVeiculo}
              disabled={!cotacaoSelecionada || chamandoVeiculo}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {chamandoVeiculo ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Chamando...
                </>
              ) : (
                <>
                  <Truck className="w-4 h-4 mr-1" />
                  Confirmar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-red-500" />
              Detalhes da Rota
            </DialogTitle>
          </DialogHeader>

          {rotaDetalhes && (
            <div className="space-y-6">
              {/* Info geral */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`mt-1 ${getStatusColor(rotaDetalhes.status)}`}>
                    {rotaDetalhes.status}
                  </Badge>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Veículo</p>
                  <p className="font-bold">{rotaDetalhes.tipoVeiculo}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                  <p className="font-bold">{rotaDetalhes.pesoTotal.toFixed(1)} kg</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Entregas</p>
                  <p className="font-bold">{rotaDetalhes.pedidos.length}</p>
                </div>
              </div>

              {/* Status Lalamove */}
              {rotaDetalhes.lalamoveOrderId && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-semibold text-orange-800">Status Lalamove</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => atualizarStatusLalamove(rotaDetalhes.id)}
                      disabled={loadingStatus}
                    >
                      <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    {getLalamoveStatusInfo(rotaDetalhes.lalamoveStatus).icon}
                    <span className={`font-medium ${getLalamoveStatusInfo(rotaDetalhes.lalamoveStatus).color}`}>
                      {getLalamoveStatusInfo(rotaDetalhes.lalamoveStatus).text}
                    </span>
                  </div>

                  {rotaDetalhes.lalamoveDriverName && (
                    <div className="mt-3 pt-3 border-t border-orange-200">
                      <p className="text-sm font-semibold text-orange-800 mb-2">Motorista:</p>
                      <div className="flex flex-wrap gap-4">
                        <span className="flex items-center gap-1 text-orange-700">
                          <User className="w-4 h-4" />
                          {rotaDetalhes.lalamoveDriverName}
                        </span>
                        {rotaDetalhes.lalamoveDriverPhone && (
                          <span className="flex items-center gap-1 text-orange-700">
                            <Phone className="w-4 h-4" />
                            {rotaDetalhes.lalamoveDriverPhone}
                          </span>
                        )}
                        {rotaDetalhes.lalamovePlateNumber && (
                          <span className="flex items-center gap-1 text-orange-700">
                            <Hash className="w-4 h-4" />
                            {rotaDetalhes.lalamovePlateNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {rotaDetalhes.lalamoveShareLink && (
                    <Button
                      className="mt-3 bg-orange-600 hover:bg-orange-700"
                      onClick={() => window.open(rotaDetalhes.lalamoveShareLink!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Abrir Rastreamento
                    </Button>
                  )}
                </div>
              )}

              {/* Mapa Interativo */}
              {config?.latitude && config?.longitude && rotaDetalhes.pedidos.length > 0 && (
                <MapaLeaflet
                  origem={{
                    latitude: config.latitude,
                    longitude: config.longitude,
                    endereco: `${config.endereco ?? ''}, ${config.numero ?? ''} - ${config.bairro ?? ''}, ${config.cidade ?? ''}`,
                  }}
                  destinos={rotaDetalhes.pedidos
                    .filter((p) => p?.latitude && p?.longitude)
                    .map((p) => ({
                      latitude: p.latitude!,
                      longitude: p.longitude!,
                      endereco: `${p.endereco}, ${p.numero} - ${p.bairro}`,
                      nomeRecebedor: p.nomeRecebedor,
                    }))}
                  tipoVeiculo={rotaDetalhes.tipoVeiculo}
                  distanciaTotal={rotaDetalhes.distanciaTotal ?? undefined}
                  tempoEstimado={rotaDetalhes.tempoEstimadoTotal ?? undefined}
                  altura="300px"
                />
              )}

              {/* Lista de pedidos */}
              <div>
                <p className="font-semibold text-gray-700 mb-3">Pedidos na rota:</p>
                <div className="space-y-2">
                  {rotaDetalhes.pedidos.map((pedido, idx) => (
                    <div
                      key={pedido.id}
                      className="bg-card border rounded-lg p-3 flex items-center gap-3 hover:border-red-300 transition-colors"
                    >
                      <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{pedido.nomeRecebedor}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {pedido.endereco}, {pedido.numero} - {pedido.bairro}, {pedido.cidade}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <Phone className="w-3 h-3" />
                          {pedido.telefone}
                          <span>•</span>
                          <Clock className="w-3 h-3" />
                          {pedido.horaEntrega}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-sm font-medium">{pedido.peso.toFixed(1)} kg</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/pedidos/${pedido.id}`, '_blank')}
                          className="h-8 px-2 border-red-200 text-red-600 hover:bg-red-50"
                          title="Abrir pedido"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
