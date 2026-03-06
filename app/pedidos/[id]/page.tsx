'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ResumoPedidoImpressao } from '@/components/resumo-pedido-impressao';
import { CartaoMensagemA6 } from '@/components/cartao-mensagem-a6';
import {
  ArrowLeft,
  Package,
  MapPin,
  Calendar,
  Phone,
  User,
  Truck,
  Clock,
  DollarSign,
  CreditCard,
  ShoppingCart,
  EyeOff,
  MessageSquare,
  Trash2,
  ExternalLink,
  Hash,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PedidoDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const [pedido, setPedido] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await fetch(`/api/pedidos/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setPedido(data);
        } else {
          toast.error('Pedido não encontrado');
          router.push('/pedidos');
        }
      } catch (error) {
        console.error('Erro ao buscar pedido:', error);
        toast.error('Erro ao carregar pedido');
      } finally {
        setLoading(false);
      }
    };

    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/configuracao');
        const data = await response.json();
        setConfig(data);
      } catch (error) {
        console.error('Erro ao buscar configuração:', error);
      }
    };

    fetchPedido();
    fetchConfig();
  }, [params.id, router]);

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/pedidos/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Pedido excluído com sucesso');
        router.push('/pedidos');
      } else {
        toast.error('Erro ao excluir pedido');
      }
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast.error('Erro ao excluir pedido');
    }
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarDataHora = (data: string) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const formatarValor = (valor?: number) => {
    if (!valor) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Aguardando Produção':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 border-yellow-300';
      case 'Em Produção':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 border-blue-300';
      case 'Pausado':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 border-orange-300';
      case 'Concluído':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 border-green-300';
      case 'Em Rota':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 border-red-300';
      case 'Entregue':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando pedido...</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Pedido não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-500">
              Pedido #{pedido.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground">
              Criado em {formatarDataHora(pedido.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(pedido.statusProducao)}`}>
            {pedido.statusProducao}
          </span>
          <ResumoPedidoImpressao pedido={pedido} nomeEmpresa={config?.nomeEmpresa} />
          <CartaoMensagemA6
            mensagem={pedido.mensagemAnonima}
            nomeRecebedor={pedido.nomeRecebedor}
            pedidoAnonimo={pedido.pedidoAnonimo}
          />
          <Button variant="destructive" size="icon" onClick={handleDelete} title="Excluir Pedido">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados do Comprador */}
        {(pedido.nomeComprador || pedido.pedidoAnonimo) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-red-500" />
                Dados do Comprador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pedido.pedidoAnonimo ? (
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-medium">
                    <EyeOff className="w-4 h-4" />
                    Pedido Anônimo
                  </div>
                  {pedido.mensagemAnonima ? (
                    <div className="mt-2 text-sm flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5" />
                      <span>&quot;{pedido.mensagemAnonima}&quot;</span>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm italic">&quot;Este presente foi enviado anonimamente.&quot;</p>
                  )}
                  {pedido.nomeComprador && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      (Interno: {pedido.nomeComprador} - {pedido.telefoneComprador})
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{pedido.nomeComprador || 'Não informado'}</span>
                  </div>
                  {pedido.telefoneComprador && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{pedido.telefoneComprador}</span>
                    </div>
                  )}
                  {pedido.mensagemAnonima && (
                    <div className="mt-3 bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg border">
                      <div className="text-sm flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 mt-0.5 text-gray-500" />
                        <span>&quot;{pedido.mensagemAnonima}&quot;</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Dados do Recebedor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Dados do Recebedor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{pedido.nomeRecebedor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{pedido.telefone}</span>
            </div>
            <div className="text-sm text-muted-foreground">CPF: {pedido.cpf}</div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-500" />
              Endereço de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{pedido.endereco}, {pedido.numero}</p>
            {pedido.complemento && <p className="text-sm text-muted-foreground">{pedido.complemento}</p>}
            <p>{pedido.bairro} - {pedido.cidade}/{pedido.estado}</p>
            <p className="text-sm text-muted-foreground">CEP: {pedido.cep}</p>
          </CardContent>
        </Card>

        {/* Entrega */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-500" />
              Informações de Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{formatarData(pedido.dataEntrega)} às {pedido.horaEntrega}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span>Tempo de produção: {pedido.tempoEstimadoProducao} min</span>
            </div>
            {pedido.origemPedido && (
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-gray-400" />
                <span>Origem: {pedido.origemPedido}</span>
              </div>
            )}
            {pedido.formaPagamento && (
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" />
                <span>Pagamento: {pedido.formaPagamento}</span>
              </div>
            )}
            <Badge variant="outline">{pedido.status}</Badge>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-500" />
              Valores
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pedido.valorTotalCompra && (
              <div className="flex justify-between">
                <span>Total da Compra:</span>
                <span className="font-bold">{formatarValor(pedido.valorTotalCompra)}</span>
              </div>
            )}
            {pedido.valorFretePago && (
              <div className="flex justify-between">
                <span>Frete (cliente):</span>
                <span>{formatarValor(pedido.valorFretePago)}</span>
              </div>
            )}
            {pedido.valorFreteReal && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Custo real frete:</span>
                <span>{formatarValor(pedido.valorFreteReal)}</span>
              </div>
            )}
            {pedido.valorFretePago && pedido.valorFreteReal && (
              <div className={`flex justify-between pt-2 border-t ${(pedido.valorFretePago - pedido.valorFreteReal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span>{(pedido.valorFretePago - pedido.valorFreteReal) >= 0 ? 'Lucro frete:' : 'Prejuízo frete:'}</span>
                <span className="font-bold">{formatarValor(Math.abs(pedido.valorFretePago - pedido.valorFreteReal))}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Descrição e Dimensões */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-red-500" />
              Descrição do Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{pedido.descricao}</p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Peso: {pedido.peso} kg</span>
              <span>Dimensões: {pedido.altura}x{pedido.largura}x{pedido.profundidade} cm</span>
            </div>
          </CardContent>
        </Card>

        {/* Rota */}
        {pedido.rota && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-500" />
                Informações da Rota
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Status badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{pedido.rota.tipoVeiculo}</Badge>
                <Badge className={
                  pedido.rota.status === 'Concluída' ? 'bg-green-100 text-green-800' :
                    pedido.rota.status === 'Em Andamento' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                }>
                  {pedido.rota.status}
                </Badge>
                {pedido.rota.lalamoveStatus && (
                  <Badge className="bg-orange-100 text-orange-800">
                    {pedido.rota.lalamoveStatus === 'ASSIGNING_DRIVER' && 'Buscando motorista...'}
                    {pedido.rota.lalamoveStatus === 'ON_GOING' && 'Motorista a caminho'}
                    {pedido.rota.lalamoveStatus === 'PICKED_UP' && 'Coletado — em entrega'}
                    {pedido.rota.lalamoveStatus === 'COMPLETED' && 'Entregue'}
                    {pedido.rota.lalamoveStatus === 'CANCELED' && 'Cancelado'}
                    {!['ASSIGNING_DRIVER', 'ON_GOING', 'PICKED_UP', 'COMPLETED', 'CANCELED'].includes(pedido.rota.lalamoveStatus) && pedido.rota.lalamoveStatus}
                  </Badge>
                )}
              </div>

              {/* Motorista */}
              {pedido.rota.lalamoveDriverName && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
                    Motorista
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                      <User className="w-4 h-4" />
                      {pedido.rota.lalamoveDriverName}
                    </span>
                    {pedido.rota.lalamoveDriverPhone && (
                      <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                        <Phone className="w-4 h-4" />
                        {pedido.rota.lalamoveDriverPhone}
                      </span>
                    )}
                    {pedido.rota.lalamovePlateNumber && (
                      <span className="flex items-center gap-1 text-blue-700 dark:text-blue-400">
                        <Hash className="w-4 h-4" />
                        {pedido.rota.lalamovePlateNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ShareLink */}
              {pedido.rota.lalamoveShareLink && (
                <a
                  href={pedido.rota.lalamoveShareLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span className="font-medium text-sm">Rastrear entrega em tempo real</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
