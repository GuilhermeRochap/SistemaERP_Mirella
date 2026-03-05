'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FormularioPedido } from '@/components/formulario-pedido';
import {
  Search, Filter, Package, ChevronRight, Truck,
  ChevronDown, ChevronUp, Route, Clock, Users, Navigation,
  Plus, List
} from 'lucide-react';

interface Pedido {
  id: string;
  nomeRecebedor: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  dataEntrega: string;
  horaEntrega: string;
  descricao: string;
  peso: number;
  status: string;
  statusProducao: string;
  rotaId: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GrupoRota {
  id: string;
  periodo: string;
  pedidos: Pedido[];
  pesoTotal: number;
  bairros: string[];
}

// Função para calcular distância entre dois pontos (Haversine)
function calcularDistancia(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Função para agrupar pedidos por período e proximidade
function agruparPedidos(pedidos: Pedido[]): GrupoRota[] {
  const grupos: GrupoRota[] = [];
  const pedidosRestantes = [...pedidos];
  let grupoId = 1;

  while (pedidosRestantes.length > 0) {
    const pedidoBase = pedidosRestantes.shift()!;
    const grupo: Pedido[] = [pedidoBase];
    const periodoBase = pedidoBase.horaEntrega?.substring(0, 2) ?? '00';

    for (let i = pedidosRestantes.length - 1; i >= 0; i--) {
      const pedido = pedidosRestantes[i];
      const periodoPedido = pedido.horaEntrega?.substring(0, 2) ?? '00';
      const diffPeriodo = Math.abs(parseInt(periodoBase) - parseInt(periodoPedido));
      if (diffPeriodo > 2) continue;

      if (pedido.latitude && pedido.longitude) {
        const ultimoPedido = grupo[grupo.length - 1];
        if (ultimoPedido.latitude && ultimoPedido.longitude) {
          const distancia = calcularDistancia(
            ultimoPedido.latitude, ultimoPedido.longitude,
            pedido.latitude, pedido.longitude
          );
          if (distancia <= 10) {
            grupo.push(pedido);
            pedidosRestantes.splice(i, 1);
            if (grupo.length >= 10) break;
          }
        }
      } else if (pedido.bairro === pedidoBase.bairro) {
        grupo.push(pedido);
        pedidosRestantes.splice(i, 1);
        if (grupo.length >= 10) break;
      }
    }

    const pesoTotal = grupo.reduce((acc, p) => acc + (p.peso ?? 0), 0);
    const bairrosUnicos = [...new Set(grupo.map(p => p.bairro))];
    const horaMin = Math.min(...grupo.map(p => parseInt(p.horaEntrega?.substring(0, 2) ?? '0')));
    const horaMax = Math.max(...grupo.map(p => parseInt(p.horaEntrega?.substring(0, 2) ?? '0')));
    const periodo = horaMin === horaMax ? `${horaMin}:00` : `${horaMin}:00 - ${horaMax}:00`;

    grupos.push({
      id: `grupo-${grupoId++}`,
      periodo,
      pedidos: grupo,
      pesoTotal,
      bairros: bairrosUnicos
    });
  }

  return grupos;
}

export default function PedidosPage() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
  const [secaoExpandida, setSecaoExpandida] = useState<Record<string, boolean>>({
    'novos': true,
    'prontos': true,
    'em-andamento': true,
    'finalizados': false
  });
  const [abaAtiva, setAbaAtiva] = useState('gerenciar');

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (busca) params.append('busca', busca);
      if (filtroStatus) params.append('status', filtroStatus);
      if (filtroData) params.append('data', filtroData);

      const response = await fetch(`/api/pedidos?${params?.toString?.()}`);
      const data = await response?.json?.();
      setPedidos(data ?? []);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [filtroStatus, filtroData]);

  const handleSearch = (e: React.FormEvent) => {
    e?.preventDefault?.();
    fetchPedidos();
  };

  const handlePedidoCriado = () => {
    fetchPedidos();
    setAbaAtiva('gerenciar');
  };

  const { pedidosNovos, pedidosProntos, pedidosEmAndamento, pedidosFinalizados } = useMemo(() => {
    const novos = pedidos.filter(p => p.statusProducao === 'Aguardando Produção');
    const prontos = pedidos.filter(p => p.statusProducao === 'Concluído' && !p.rotaId);
    const emAndamento = pedidos.filter(p =>
      ['Em Produção', 'Pausado'].includes(p.statusProducao) ||
      (p.statusProducao === 'Em Rota' && p.rotaId)
    );
    const finalizados = pedidos.filter(p => p.statusProducao === 'Entregue');
    return { pedidosNovos: novos, pedidosProntos: prontos, pedidosEmAndamento: emAndamento, pedidosFinalizados: finalizados };
  }, [pedidos]);

  const gruposRotaSugerida = useMemo(() => agruparPedidos(pedidosProntos), [pedidosProntos]);

  const toggleGrupo = (grupoId: string) => {
    setGruposExpandidos(prev => ({ ...prev, [grupoId]: !prev[grupoId] }));
  };

  const toggleSecao = (secaoId: string) => {
    setSecaoExpandida(prev => ({ ...prev, [secaoId]: !prev[secaoId] }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Produção': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 border-yellow-300';
      case 'Em Produção': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 border-blue-300';
      case 'Pausado': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 border-orange-300';
      case 'Concluído': return 'bg-green-100 dark:bg-green-900/30 text-green-800 border-green-300';
      case 'Em Rota': return 'bg-red-100 dark:bg-red-900/30 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const renderPedidoCompacto = (pedido: Pedido) => (
    <div
      key={pedido.id}
      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
      onClick={() => router.push(`/pedidos/${pedido.id}`)}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <Package className="w-4 h-4 text-red-600" />
        </div>
        <div>
          <p className="font-medium text-sm">{pedido.nomeRecebedor}</p>
          <p className="text-xs text-muted-foreground">{pedido.bairro} • {pedido.horaEntrega}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs">{pedido.peso} kg</Badge>
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );

  const renderPedidoCompleto = (pedido: Pedido) => (
    <div
      key={pedido.id}
      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => router.push(`/pedidos/${pedido.id}`)}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
          <Package className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{pedido.nomeRecebedor}</h3>
          <p className="text-xs text-muted-foreground">
            {pedido.bairro} • {new Date(pedido.dataEntrega).toLocaleDateString('pt-BR')} às {pedido.horaEntrega}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(pedido.statusProducao)}`}>
          {pedido.statusProducao}
        </span>
        {pedido.rotaId && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
          Pedidos
        </h1>
        <p className="text-muted-foreground">
          Cadastre novos pedidos e gerencie entregas agrupadas
        </p>
      </div>

      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="novo" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Novo Pedido
          </TabsTrigger>
          <TabsTrigger value="gerenciar" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            Gerenciar
            {pedidos.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {pedidos.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab: Novo Pedido */}
        <TabsContent value="novo" className="mt-6">
          <div className="max-w-4xl mx-auto">
            <FormularioPedido onSuccess={handlePedidoCriado} />
          </div>
        </TabsContent>

        {/* Tab: Gerenciar Pedidos */}
        <TabsContent value="gerenciar" className="mt-6 space-y-4">
          {/* Filtros Compactos */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="busca" className="text-xs">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="busca"
                      value={busca}
                      onChange={(e) => setBusca(e?.target?.value ?? '')}
                      placeholder="Nome ou telefone"
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
                <div className="w-40">
                  <Label htmlFor="filtroStatus" className="text-xs">Status</Label>
                  <select
                    id="filtroStatus"
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e?.target?.value ?? '')}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm"
                  >
                    <option value="">Todos</option>
                    <option value="Aguardando Produção">Aguardando</option>
                    <option value="Em Produção">Em Produção</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Em Rota">Em Rota</option>
                    <option value="Entregue">Entregue</option>
                  </select>
                </div>
                <div className="w-36">
                  <Label htmlFor="filtroData" className="text-xs">Data</Label>
                  <Input
                    id="filtroData"
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e?.target?.value ?? '')}
                    className="h-9"
                  />
                </div>
                <Button type="submit" size="sm" className="bg-red-600 hover:bg-red-700 h-9">
                  <Filter className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando pedidos...</p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhum pedido encontrado</p>
              <Button onClick={() => setAbaAtiva('novo')} className="bg-red-600 hover:bg-red-700">
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Primeiro Pedido
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Seção: Novos Pedidos (Aguardando Produção) */}
              {pedidosNovos.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-800">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSecao('novos')}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Novos Pedidos</span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30">
                        {pedidosNovos.length} aguardando produção
                      </Badge>
                    </div>
                    {secaoExpandida['novos'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  {secaoExpandida['novos'] && (
                    <CardContent className="pt-0 space-y-2">
                      {pedidosNovos.map(renderPedidoCompleto)}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Seção: Prontos para Rota */}
              {gruposRotaSugerida.length > 0 && (
                <Card className="border-green-200 dark:border-green-800">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSecao('prontos')}
                  >
                    <div className="flex items-center gap-2">
                      <Route className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">Prontos para Rota</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30">
                        {pedidosProntos.length} • {gruposRotaSugerida.length} rotas
                      </Badge>
                    </div>
                    {secaoExpandida['prontos'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>

                  {secaoExpandida['prontos'] && (
                    <CardContent className="pt-0 space-y-2">
                      {gruposRotaSugerida.map((grupo) => (
                        <div key={grupo.id} className="border rounded-lg overflow-hidden">
                          <div
                            className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                            onClick={() => toggleGrupo(grupo.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Navigation className="w-5 h-5 text-green-600" />
                              <div>
                                <p className="font-medium text-sm">
                                  {grupo.bairros.slice(0, 2).join(', ')}
                                  {grupo.bairros.length > 2 && ` +${grupo.bairros.length - 2}`}
                                </p>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  <span><Clock className="w-3 h-3 inline mr-1" />{grupo.periodo}</span>
                                  <span><Users className="w-3 h-3 inline mr-1" />{grupo.pedidos.length}</span>
                                  <span><Package className="w-3 h-3 inline mr-1" />{grupo.pesoTotal.toFixed(1)}kg</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-300 h-8"
                                onClick={(e) => { e.stopPropagation(); router.push('/otimizador'); }}
                              >
                                <Truck className="w-4 h-4 mr-1" />
                                Rota
                              </Button>
                              {gruposExpandidos[grupo.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                          {gruposExpandidos[grupo.id] && (
                            <div className="p-3 space-y-2 bg-background">
                              {grupo.pedidos.map(renderPedidoCompacto)}
                            </div>
                          )}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Seção: Em Andamento */}
              {pedidosEmAndamento.length > 0 && (
                <Card className="border-blue-200 dark:border-blue-800">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSecao('em-andamento')}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Em Andamento</span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30">
                        {pedidosEmAndamento.length}
                      </Badge>
                    </div>
                    {secaoExpandida['em-andamento'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  {secaoExpandida['em-andamento'] && (
                    <CardContent className="pt-0 space-y-2">
                      {pedidosEmAndamento.map(renderPedidoCompleto)}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Seção: Entregues */}
              {pedidosFinalizados.length > 0 && (
                <Card className="border-gray-200 dark:border-gray-700">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleSecao('finalizados')}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-gray-500" />
                      <span className="font-semibold text-gray-600">Entregues</span>
                      <Badge variant="outline">{pedidosFinalizados.length}</Badge>
                    </div>
                    {secaoExpandida['finalizados'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  {secaoExpandida['finalizados'] && (
                    <CardContent className="pt-0 space-y-2">
                      {pedidosFinalizados.map(renderPedidoCompleto)}
                    </CardContent>
                  )}
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
