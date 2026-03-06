'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Truck, Package, MapPin, Clock, TrendingUp, Bike, Car, RefreshCw, Loader2, AlertCircle, Users, CheckCircle2, Zap, Edit, Save, X, Search, RotateCcw, GripVertical, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Importar Leaflet dinamicamente para evitar SSR
const MapaLeaflet = dynamic(() => import('@/components/mapa-leaflet'), {
  ssr: false,
  loading: () => <div className="h-[200px] bg-muted animate-pulse rounded-lg" />
});

interface Cotacao {
  serviceType: string;
  vehicleName: string;
  quotationId: string;
  price: string;
  priceFormatted: string;
  currency: string;
  expiresAt: string;
  distance?: { value: string; unit: string };
}

interface GrupoCotacao {
  grupoId: number;
  pedidos: any[];
  pesoTotal: number;
  tipoVeiculoSugerido: string;
  cotacoes: Cotacao[];
  origem: {
    latitude: number;
    longitude: number;
    endereco: string;
  };
  destinos: {
    latitude: number;
    longitude: number;
    endereco: string;
    nomeRecebedor: string;
  }[];
  cotacaoSelecionada?: Cotacao;
}

interface CotacaoAgrupada {
  grupos: GrupoCotacao[];
  totalPedidos: number;
  totalGrupos: number;
}

interface Rota {
  id: string;
  tipoVeiculo: string;
  pesoTotal: number;
  distanciaTotal: number;
  tempoEstimadoTotal: number;
  pedidos: any[];
  lalamoveOrderId?: string | null;
  lalamoveStatus?: string | null;
}

interface EnderecoEdicao {
  pedidoId: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
}

// Componente de item sortável (drag and drop)
function SortablePedidoItem({
  pedido,
  idx,
  onVoltarKds,
  onEditarEndereco,
}: {
  pedido: any;
  idx: number;
  onVoltarKds: (id: string) => void;
  onEditarEndereco: (pedido: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pedido.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border"
    >
      <div className="flex items-center gap-2">
        {/* Handle de drag */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 rounded touch-none"
          title="Arrastar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
          {idx + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{pedido.nomeRecebedor}</p>
          <p className="text-xs text-muted-foreground truncate">
            {pedido.endereco}, {pedido.numero} - {pedido.bairro}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onVoltarKds(pedido.id)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
          title="Voltar para o KDS"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          KDS
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEditarEndereco(pedido)}
          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 px-2"
        >
          <Edit className="w-4 h-4 mr-1" />
          Editar
        </Button>
      </div>
    </div>
  );
}

export default function OtimizadorPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingCriacao, setLoadingCriacao] = useState(false);
  const [cancelandoVeiculo, setCancelandoVeiculo] = useState<string | null>(null);
  const [gruposCotacao, setGruposCotacao] = useState<CotacaoAgrupada | null>(null);
  const [rotasCriadas, setRotasCriadas] = useState<Rota[]>([]);
  const [semPedidos, setSemPedidos] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Mapa de ordem de pedidos por grupo (para drag and drop)
  const [ordemPorGrupo, setOrdemPorGrupo] = useState<Record<number, any[]>>({});
  // Controle de carregamento por grupo ao reordenar
  const [recalculandoGrupo, setRecalculandoGrupo] = useState<Record<number, boolean>>({});

  // Carregar do LocalStorage ao montar
  useEffect(() => {
    setMounted(true);

    if (typeof window !== 'undefined') {
      const savedGrupos = localStorage.getItem('otimizador_grupos');
      const savedOrdem = localStorage.getItem('otimizador_ordem');

      if (savedGrupos) {
        try {
          setGruposCotacao(JSON.parse(savedGrupos));
          setLoading(false);
        } catch (e) {
          console.error('Erro ao ler grupos do localStorage', e);
        }
      } else {
        carregarEAgrupar();
      }

      if (savedOrdem) {
        try {
          setOrdemPorGrupo(JSON.parse(savedOrdem));
        } catch (e) {
          console.error('Erro ao ler ordem do localStorage', e);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executa apenas na montagem

  // Salvar no LocalStorage sempre que houver mudanças importantes state
  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (gruposCotacao) {
      localStorage.setItem('otimizador_grupos', JSON.stringify(gruposCotacao));
    } else {
      localStorage.removeItem('otimizador_grupos');
    }
  }, [gruposCotacao, mounted]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    if (Object.keys(ordemPorGrupo).length > 0) {
      localStorage.setItem('otimizador_ordem', JSON.stringify(ordemPorGrupo));
    } else {
      localStorage.removeItem('otimizador_ordem');
    }
  }, [ordemPorGrupo, mounted]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (grupoId: number) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const grupo = gruposCotacao?.grupos.find(g => g.grupoId === grupoId);
    if (!grupo) return;

    const pedidosAtual = ordemPorGrupo[grupoId] || grupo.pedidos;
    const oldIndex = pedidosAtual.findIndex((p: any) => p && p.id === active.id);
    const newIndex = pedidosAtual.findIndex((p: any) => p && p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const novaOrdem = arrayMove(pedidosAtual, oldIndex, newIndex);

    // Save immediate state
    setOrdemPorGrupo(prev => ({ ...prev, [grupoId]: novaOrdem }));

    // Recalcular cotação para a nova ordem
    if (novaOrdem.length > 0) {
      setRecalculandoGrupo(prev => ({ ...prev, [grupoId]: true }));
      try {
        const pedidoIds = novaOrdem.map(p => p.id);

        // Passar o tipoVeiuculo da cotação selecionada se houver, ou o tipo sugerido
        const tipoVeiculo = grupo?.cotacaoSelecionada?.vehicleName || grupo?.tipoVeiculoSugerido;

        const response = await fetch('/api/rotas/cotacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoIds, tipoVeiculo }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.quotations && data.quotations.length > 0) {
            // Selecionar a cotação mais barata
            const novaCotacao = [...data.quotations].sort((a, b) =>
              parseFloat(a.price) - parseFloat(b.price)
            )[0];

            selecionarCotacaoGrupo(grupoId, novaCotacao);
            toast.success(`Cotação recalculada para a nova ordem!`, { id: `recalc-${grupoId}` });
          }
        } else {
          toast.error('Não foi possível recalcular a cotação.');
        }
      } catch (error) {
        console.error('Erro ao recalcular rota:', error);
        toast.error('Erro ao recalcular a cotação.');
      } finally {
        setRecalculandoGrupo(prev => ({ ...prev, [grupoId]: false }));
      }
    }
  };

  // Estados para edição de endereço
  const [modalEdicao, setModalEdicao] = useState(false);
  const [pedidoEditando, setPedidoEditando] = useState<any>(null);
  const [enderecoTemp, setEnderecoTemp] = useState<EnderecoEdicao | null>(null);
  const [salvandoEndereco, setSalvandoEndereco] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Cancelar solicitação de veículo Lalamove
  const cancelarVeiculo = async (rotaId: string) => {
    if (!window.confirm('Deseja cancelar a solicitação de veículo? Esta ação não pode ser desfeita se o motorista já aceitou.'))
      return;
    setCancelandoVeiculo(rotaId);
    try {
      const response = await fetch(`/api/rotas/${rotaId}/cancelar-veiculo`, {
        method: 'POST',
      });
      if (response.ok) {
        toast.success('Veículo cancelado com sucesso!');
        setRotasCriadas(prev => prev.map(r =>
          r.id === rotaId
            ? { ...r, lalamoveOrderId: null, lalamoveStatus: null }
            : r
        ));
      } else {
        const err = await response.json();
        toast.error(err?.error ?? 'Erro ao cancelar veículo');
      }
    } catch {
      toast.error('Erro ao cancelar veículo');
    } finally {
      setCancelandoVeiculo(null);
    }
  };

  // Voltar pedido para o KDS
  const voltarParaKds = async (pedidoId: string) => {
    if (!window.confirm('Deseja enviar este pedido de volta para o KDS? Ele voltará para "Aguardando Produção".'))
      return;
    try {
      const response = await fetch('/api/kds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoId, acao: 'voltar-kds' }),
      });
      if (response.ok) {
        toast.success('Pedido devolvido ao KDS!');
        await carregarEAgrupar();
      } else {
        toast.error('Erro ao devolver pedido');
      }
    } catch {
      toast.error('Erro ao devolver pedido');
    }
  };

  // Buscar endereço por CEP
  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;

    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro && enderecoTemp) {
        setEnderecoTemp({
          ...enderecoTemp,
          endereco: data.logradouro || enderecoTemp.endereco,
          bairro: data.bairro || enderecoTemp.bairro,
          cidade: data.localidade || enderecoTemp.cidade,
          estado: data.uf || enderecoTemp.estado,
        });
        toast.success('Endereço encontrado!');
      }
    } catch {
      toast.error('Erro ao buscar CEP');
    } finally {
      setBuscandoCep(false);
    }
  };

  // Abrir modal de edição de endereço
  const abrirEdicaoEndereco = (pedido: any) => {
    setPedidoEditando(pedido);
    setEnderecoTemp({
      pedidoId: pedido.id,
      cep: pedido.cep || '',
      endereco: pedido.endereco || '',
      numero: pedido.numero || '',
      complemento: pedido.complemento || '',
      bairro: pedido.bairro || '',
      cidade: pedido.cidade || '',
      estado: pedido.estado || '',
    });
    setModalEdicao(true);
  };

  // Salvar endereço editado e re-geocodificar
  const salvarEndereco = async () => {
    if (!enderecoTemp || !pedidoEditando) return;

    setSalvandoEndereco(true);
    try {
      // Atualizar o pedido com novo endereço e re-geocodificar
      const response = await fetch(`/api/pedidos/${pedidoEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cep: enderecoTemp.cep,
          endereco: enderecoTemp.endereco,
          numero: enderecoTemp.numero,
          complemento: enderecoTemp.complemento,
          bairro: enderecoTemp.bairro,
          cidade: enderecoTemp.cidade,
          estado: enderecoTemp.estado,
          regeocoding: true, // Flag para re-geocodificar
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar endereço');
      }

      toast.success('Endereço atualizado! Recalculando rotas...');
      setModalEdicao(false);
      setPedidoEditando(null);
      setEnderecoTemp(null);

      // Recarregar e reagrupar automaticamente
      await carregarEAgrupar();
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      toast.error('Erro ao salvar endereço');
    } finally {
      setSalvandoEndereco(false);
    }
  };

  // Carregar e agrupar automaticamente
  const carregarEAgrupar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    setSemPedidos(false);
    setGruposCotacao(null);

    try {
      // 1. Buscar pedidos disponíveis
      const pedidosResponse = await fetch('/api/rotas/pedidos-disponiveis');
      if (!pedidosResponse.ok) {
        throw new Error('Erro ao buscar pedidos');
      }

      const pedidos = await pedidosResponse.json();

      if (!pedidos || pedidos.length === 0) {
        setSemPedidos(true);
        setLoading(false);
        return;
      }

      // 2. Agrupar automaticamente e buscar cotações
      const pedidoIds = pedidos.map((p: any) => p.id);

      const cotacaoResponse = await fetch('/api/rotas/cotacao-agrupada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pedidoIds }),
      });

      if (!cotacaoResponse.ok) {
        const errorData = await cotacaoResponse.json();
        throw new Error(errorData.error || 'Erro ao agrupar pedidos');
      }

      const data = await cotacaoResponse.json();

      // Auto-selecionar a cotação mais barata para cada grupo
      if (data.grupos) {
        data.grupos = data.grupos.map((grupo: GrupoCotacao) => {
          if (grupo.cotacoes && grupo.cotacoes.length > 0) {
            // Ordenar por preço e selecionar a mais barata
            const cotacaoMaisBarata = [...grupo.cotacoes].sort((a, b) =>
              parseFloat(a.price) - parseFloat(b.price)
            )[0];
            return { ...grupo, cotacaoSelecionada: cotacaoMaisBarata };
          }
          return grupo;
        });
      }

      setGruposCotacao(data);

      if (data.grupos?.length > 0) {
        toast.success(`${data.totalGrupos} grupo(s) criado(s) automaticamente!`);
      }
    } catch (error: any) {
      console.error('Erro ao carregar:', error);
      setErro(error.message || 'Erro ao processar pedidos');
      toast.error(error.message || 'Erro ao processar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  const forcarAtualizacao = useCallback(async () => {
    localStorage.removeItem('otimizador_grupos');
    localStorage.removeItem('otimizador_ordem');
    setOrdemPorGrupo({});
    await carregarEAgrupar();
  }, [carregarEAgrupar]);

  useEffect(() => {
    carregarEAgrupar();
  }, [carregarEAgrupar]);

  // Selecionar cotação para um grupo
  const selecionarCotacaoGrupo = (grupoId: number, cotacao: Cotacao) => {
    if (!gruposCotacao) return;

    setGruposCotacao(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        grupos: prev.grupos.map(g =>
          g.grupoId === grupoId
            ? { ...g, cotacaoSelecionada: cotacao }
            : g
        ),
      };
    });
  };

  // Criar rota a partir de um grupo (e chamar veículo automaticamente)
  const criarRotaDoGrupo = async (grupo: GrupoCotacao) => {
    if (!grupo.cotacaoSelecionada) {
      toast.error('Selecione uma cotação primeiro');
      return;
    }

    setLoadingCriacao(true);
    try {
      const pedidosOrdenados = ordemPorGrupo[grupo.grupoId] || grupo.pedidos;
      const pedidoIds = pedidosOrdenados.map((p: any) => p.id);
      const tipoVeiculo = grupo.cotacaoSelecionada.vehicleName;
      const serviceType = grupo.cotacaoSelecionada.serviceType;

      // 1. Criar a rota
      const response = await fetch('/api/rotas/agrupar-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoIds,
          tipoVeiculo,
          quotationId: grupo.cotacaoSelecionada.quotationId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error?.error ?? 'Erro ao criar rota');
        return;
      }

      const rotaCriada = await response.json();
      toast.success(`Rota do Grupo ${grupo.grupoId} criada! Chamando veículo...`);

      // 2. Chamar veículo automaticamente com a cotação já selecionada
      try {
        const veiculoResponse = await fetch(`/api/rotas/${rotaCriada.id}/chamar-veiculo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceType }),
        });

        if (veiculoResponse.ok) {
          const veiculoData = await veiculoResponse.json();
          toast.success(`🚗 Veículo chamado! Aguardando motorista...`);
          // Atualizar a rota criada com os dados do Lalamove
          rotaCriada.lalamoveOrderId = veiculoData.orderId;
          rotaCriada.lalamoveStatus = veiculoData.status;
        } else {
          const veiculoError = await veiculoResponse.json();
          toast.error(`Rota criada, mas erro ao chamar veículo: ${veiculoError?.error ?? 'Tente em Rotas'}`);
        }
      } catch (veiculoErr) {
        console.error('Erro ao chamar veículo automaticamente:', veiculoErr);
        toast.error('Rota criada! Chame o veículo manualmente em Rotas.');
      }

      setRotasCriadas(prev => [...prev, rotaCriada]);

      // Remover grupo da lista
      setGruposCotacao(prev => {
        if (!prev) return prev;
        const novosGrupos = prev.grupos.filter(g => g.grupoId !== grupo.grupoId);
        if (novosGrupos.length === 0) return null;
        return { ...prev, grupos: novosGrupos, totalGrupos: novosGrupos.length };
      });
    } catch (error) {
      console.error('Erro ao criar rota:', error);
      toast.error('Erro ao criar rota');
    } finally {
      setLoadingCriacao(false);
    }
  };

  // Criar todas as rotas de uma vez (e chamar veículos automaticamente)
  const criarTodasRotas = async () => {
    if (!gruposCotacao || gruposCotacao.grupos.length === 0) return;

    const gruposComCotacao = gruposCotacao.grupos.filter(g => g.cotacaoSelecionada);
    if (gruposComCotacao.length === 0) {
      toast.error('Nenhum grupo com cotação selecionada');
      return;
    }

    setLoadingCriacao(true);
    let criadas = 0;
    let veiculosChamados = 0;

    for (const grupo of gruposComCotacao) {
      try {
        const pedidosOrdenados = ordemPorGrupo[grupo.grupoId] || grupo.pedidos;
        const pedidoIds = pedidosOrdenados.map((p: any) => p.id);
        const tipoVeiculo = grupo.cotacaoSelecionada!.vehicleName;
        const serviceType = grupo.cotacaoSelecionada!.serviceType;

        // 1. Criar rota
        const response = await fetch('/api/rotas/agrupar-manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pedidoIds,
            tipoVeiculo,
            quotationId: grupo.cotacaoSelecionada!.quotationId,
          }),
        });

        if (!response.ok) continue;

        const rotaCriada = await response.json();
        criadas++;

        // 2. Chamar veículo automaticamente
        try {
          const veiculoResponse = await fetch(`/api/rotas/${rotaCriada.id}/chamar-veiculo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ serviceType }),
          });

          if (veiculoResponse.ok) {
            const veiculoData = await veiculoResponse.json();
            rotaCriada.lalamoveOrderId = veiculoData.orderId;
            rotaCriada.lalamoveStatus = veiculoData.status;
            veiculosChamados++;
          }
        } catch (veiculoErr) {
          console.error(`Erro ao chamar veículo do grupo ${grupo.grupoId}:`, veiculoErr);
        }

        setRotasCriadas(prev => [...prev, rotaCriada]);
      } catch (error) {
        console.error(`Erro ao criar rota do grupo ${grupo.grupoId}:`, error);
      }
    }

    if (criadas > 0) {
      if (veiculosChamados === criadas) {
        toast.success(`✅ ${criadas} rota(s) criada(s) e ${veiculosChamados} veículo(s) chamado(s)!`);
      } else if (veiculosChamados > 0) {
        toast.success(`${criadas} rota(s) criada(s). ${veiculosChamados} veículo(s) chamado(s). Chame os demais em Rotas.`);
      } else {
        toast.success(`${criadas} rota(s) criada(s)! Chame os veículos em Rotas.`);
      }
      setGruposCotacao(null);
    }

    setLoadingCriacao(false);
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

  // Loading inicial ou não montado (SSR)
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        <div className="text-center">
          <h2 className="text-xl font-semibold">Otimizando Rotas...</h2>
          <p className="text-muted-foreground">Carregando mapa e grupos</p>
        </div>
      </div>
    );
  }

  // Sem pedidos
  if (semPedidos) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
            Otimizador de Rotas
          </h1>
          <p className="text-muted-foreground">
            Agrupamento automático por proximidade (máx. 10km) e limite de 10 pedidos por rota
          </p>
        </div>

        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Nenhum pedido disponível</h2>
            <p className="text-muted-foreground text-center mt-2">
              Pedidos concluídos na produção (KDS) aparecerão aqui automaticamente
            </p>
            <Button onClick={carregarEAgrupar} className="mt-6">
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Erro
  if (erro) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
            Otimizador de Rotas
          </h1>
        </div>

        <Card className="border-2 border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-700">{erro}</h2>
            <Button onClick={forcarAtualizacao} className="mt-6" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-500">
            Otimizador de Rotas
          </h1>
          <p className="text-muted-foreground mt-1">
            Agrupamento automático • Máx. 10km entre pedidos • Máx. 10 pedidos por rota
          </p>
        </div>
        <Button onClick={forcarAtualizacao} variant="outline" title="Isso limpa sua sessão salva e busca pedidos do zero">
          <RefreshCw className="w-4 h-4 mr-2" />
          Limpar e Atualizar
        </Button>
      </div>

      {/* Grupos prontos para criar rotas */}
      {gruposCotacao && gruposCotacao.grupos.length > 0 && (
        <>
          {/* Resumo e botão criar todas */}
          <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-900/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Zap className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-green-800 dark:text-green-400">
                      {gruposCotacao.totalGrupos} grupo(s) prontos • {gruposCotacao.totalPedidos} pedidos
                    </h2>
                    <p className="text-sm text-green-700 dark:text-green-500">
                      Cotação mais barata pré-selecionada em cada grupo
                    </p>
                  </div>
                </div>
                <Button
                  onClick={criarTodasRotas}
                  disabled={loadingCriacao}
                  className="bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loadingCriacao ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Criar Todas as Rotas
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Grupos */}
          <div className="grid grid-cols-1 gap-6">
            {gruposCotacao.grupos.map((grupo) => (
              <Card key={grupo.grupoId} className="border-2 border-orange-200">
                <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-lg">Grupo {grupo.grupoId}</p>
                        <p className="text-sm text-muted-foreground font-normal">
                          {grupo.pedidos.length} pedidos • {grupo.pesoTotal.toFixed(1)} kg
                        </p>
                      </div>
                    </CardTitle>
                    {recalculandoGrupo[grupo.grupoId] ? (
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 text-base px-3 py-1 flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" /> Recalculando...
                      </Badge>
                    ) : grupo.cotacaoSelecionada ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-base px-3 py-1">
                        {grupo.cotacaoSelecionada.vehicleName} - {grupo.cotacaoSelecionada.priceFormatted}
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* Mapa */}
                  <MapaLeaflet
                    origem={grupo.origem}
                    destinos={(ordemPorGrupo[grupo.grupoId] || grupo.pedidos).filter(Boolean).map((p: any) => ({
                      latitude: p.latitude,
                      longitude: p.longitude,
                      endereco: `${p.endereco ?? ''}, ${p.numero ?? ''} - ${p.bairro ?? ''}`,
                      nomeRecebedor: p.nomeRecebedor ?? 'Sem Nome',
                    }))}
                    tipoVeiculo={grupo.cotacaoSelecionada?.vehicleName ?? grupo.tipoVeiculoSugerido}
                    altura="200px"
                  />

                  {/* Lista de pedidos com drag and drop */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Ordem de entrega
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GripVertical className="w-3 h-3" />
                        Arraste para reordenar
                      </p>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd(grupo.grupoId)}
                    >
                      <SortableContext
                        items={(ordemPorGrupo[grupo.grupoId] ?? grupo.pedidos).map((p: any) => p.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {(ordemPorGrupo[grupo.grupoId] || grupo.pedidos).filter(Boolean).map((pedido: any, idx: number) => (
                          <SortablePedidoItem
                            key={pedido.id}
                            pedido={pedido}
                            idx={idx}
                            onVoltarKds={voltarParaKds}
                            onEditarEndereco={abrirEdicaoEndereco}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>

                  {/* Cotações */}
                  {grupo.cotacoes.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {grupo.cotacoes.map((cotacao) => (
                        <div
                          key={cotacao.quotationId}
                          onClick={() => selecionarCotacaoGrupo(grupo.grupoId, cotacao)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${grupo.cotacaoSelecionada?.quotationId === cotacao.quotationId
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 bg-card hover:border-orange-400'
                            }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded ${getVehicleColor(cotacao.serviceType)}`}>
                              {getVehicleIcon(cotacao.serviceType)}
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{cotacao.vehicleName}</p>
                              <p className="font-bold text-orange-600">{cotacao.priceFormatted}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-center">
                      <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
                      <p className="text-sm text-red-700">Sem cotações disponíveis</p>
                    </div>
                  )}

                  {/* Botão criar rota individual */}
                  {grupo.cotacaoSelecionada && (
                    <Button
                      onClick={() => criarRotaDoGrupo(grupo)}
                      disabled={loadingCriacao}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {loadingCriacao ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <TrendingUp className="w-4 h-4 mr-2" />
                      )}
                      Criar Rota - {grupo.cotacaoSelecionada.priceFormatted}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Rotas criadas */}
      {rotasCriadas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            Rotas Criadas ({rotasCriadas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rotasCriadas.map((rota, index) => (
              <Card key={rota.id} className="border-2 border-green-200">
                <CardHeader className="bg-green-50 dark:bg-green-900/20 py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className={`p-2 rounded ${getVehicleColor(rota.tipoVeiculo)}`}>
                        {getVehicleIcon(rota.tipoVeiculo)}
                      </div>
                      Rota #{index + 1} - {rota.tipoVeiculo}
                    </CardTitle>
                    <Badge variant="outline">{rota.pedidos.length} pedidos</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Peso</p>
                      <p className="font-bold">{rota.pesoTotal.toFixed(1)} kg</p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="font-bold">{rota.distanciaTotal.toFixed(1)} km</p>
                    </div>
                    <div className="bg-muted rounded p-2">
                      <p className="text-xs text-muted-foreground">Tempo</p>
                      <p className="font-bold">{rota.tempoEstimadoTotal} min</p>
                    </div>
                  </div>
                  {rota.lalamoveOrderId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelarVeiculo(rota.id)}
                      disabled={cancelandoVeiculo === rota.id}
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      {cancelandoVeiculo === rota.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Cancelar Solicitação de Veículo
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Nada para mostrar após criar todas as rotas */}
      {!gruposCotacao && rotasCriadas.length === 0 && !semPedidos && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold">Tudo pronto!</h2>
            <p className="text-muted-foreground">Nenhum pedido pendente para agrupar</p>
            <Button onClick={forcarAtualizacao} className="mt-4" variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Verificar Novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modal de Edição de Endereço */}
      <Dialog open={modalEdicao} onOpenChange={setModalEdicao}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" />
              Editar Endereço de Entrega
            </DialogTitle>
          </DialogHeader>

          {pedidoEditando && enderecoTemp && (
            <div className="space-y-4 py-2">
              {/* Info do pedido */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="font-semibold">{pedidoEditando.nomeRecebedor}</p>
                <p className="text-sm text-muted-foreground">Pedido #{pedidoEditando.id?.slice(0, 8)}</p>
              </div>

              {/* CEP com busca */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={enderecoTemp.cep}
                    onChange={(e) => setEnderecoTemp({ ...enderecoTemp, cep: e.target.value })}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => buscarCep(enderecoTemp.cep)}
                    disabled={buscandoCep}
                  >
                    {buscandoCep ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <Label htmlFor="endereco">Rua/Avenida</Label>
                <Input
                  id="endereco"
                  value={enderecoTemp.endereco}
                  onChange={(e) => setEnderecoTemp({ ...enderecoTemp, endereco: e.target.value })}
                  placeholder="Nome da rua"
                />
              </div>

              {/* Número e Complemento */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={enderecoTemp.numero}
                    onChange={(e) => setEnderecoTemp({ ...enderecoTemp, numero: e.target.value })}
                    placeholder="Nº"
                  />
                </div>
                <div>
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={enderecoTemp.complemento}
                    onChange={(e) => setEnderecoTemp({ ...enderecoTemp, complemento: e.target.value })}
                    placeholder="Apto, Bloco..."
                  />
                </div>
              </div>

              {/* Bairro */}
              <div>
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={enderecoTemp.bairro}
                  onChange={(e) => setEnderecoTemp({ ...enderecoTemp, bairro: e.target.value })}
                  placeholder="Bairro"
                />
              </div>

              {/* Cidade e Estado */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={enderecoTemp.cidade}
                    onChange={(e) => setEnderecoTemp({ ...enderecoTemp, cidade: e.target.value })}
                    placeholder="Cidade"
                  />
                </div>
                <div>
                  <Label htmlFor="estado">UF</Label>
                  <Input
                    id="estado"
                    value={enderecoTemp.estado}
                    onChange={(e) => setEnderecoTemp({ ...enderecoTemp, estado: e.target.value })}
                    placeholder="UF"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setModalEdicao(false)}
              disabled={salvandoEndereco}
            >
              <X className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
            <Button
              onClick={salvarEndereco}
              disabled={salvandoEndereco}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {salvandoEndereco ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-1" />
                  Salvar e Recalcular
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
