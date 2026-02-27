import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as lalamoveClient from '@/lib/lalamove-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { serviceType = 'LALAGO' } = body;

    // Buscar a rota com os pedidos
    const rota = await db.rota.findUnique({
      where: { id: params.id },
      include: {
        pedidos: true
      }
    });

    if (!rota) {
      return NextResponse.json(
        { error: 'Rota não encontrada' },
        { status: 404 }
      );
    }

    if (rota.lalamoveOrderId) {
      return NextResponse.json(
        { error: 'Já existe um pedido Lalamove para esta rota', orderId: rota.lalamoveOrderId },
        { status: 400 }
      );
    }

    // Buscar configuração de origem
    const config = await db.configuracao.findUnique({
      where: { id: 'config_principal' }
    });

    if (!config?.latitude || !config?.longitude) {
      return NextResponse.json(
        { error: 'Endereço de origem não configurado' },
        { status: 400 }
      );
    }

    // Montar paradas
    const stops: lalamoveClient.LalamoveStop[] = [
      {
        coordinates: {
          lat: String(config.latitude),
          lng: String(config.longitude)
        },
        address: `${config.endereco}, ${config.numero} - ${config.bairro}, ${config.cidade}/${config.estado}`
      }
    ];

    // Adicionar destinos na ordem da rota
    const ordemIds = rota.ordem as string[];
    const pedidosOrdenados: typeof rota.pedidos = [];
    for (const pedidoId of ordemIds) {
      const pedido = rota.pedidos.find(p => p.id === pedidoId);
      if (pedido?.latitude && pedido?.longitude) {
        pedidosOrdenados.push(pedido);
        stops.push({
          coordinates: {
            lat: String(pedido.latitude),
            lng: String(pedido.longitude)
          },
          address: `${pedido.endereco}, ${pedido.numero} - ${pedido.bairro}, ${pedido.cidade}/${pedido.estado}`
        });
      }
    }

    console.log('Buscando nova cotação Lalamove para criar pedido:', { serviceType, stops: stops.length });

    // Primeiro, obter nova cotação para ter os stopIds corretos
    const quotation = await lalamoveClient.getQuotation(
      serviceType as lalamoveClient.LalamoveServiceType,
      stops
    );

    if (!quotation) {
      return NextResponse.json(
        { error: 'Não foi possível obter cotação da Lalamove. Verifique se o endereço está na área de cobertura.' },
        { status: 400 }
      );
    }

    console.log('Cotação obtida:', { quotationId: quotation.quotationId, stops: quotation.stops });

    // Usar os stopIds retornados pela cotação
    const stopIds = quotation.stops?.map(s => s.stopId) || [];
    
    // Se não temos stopIds da cotação, usar índices como string
    const senderStopId = stopIds[0] || '0';
    const recipientStopIds = stopIds.slice(1);

    // Função para formatar telefone no padrão internacional brasileiro
    const formatarTelefone = (telefone: string): string => {
      // Remove tudo que não é número
      let numero = telefone.replace(/\D/g, '');
      // Se já começa com 55, mantém
      if (numero.startsWith('55') && numero.length >= 12) {
        return '+' + numero;
      }
      // Se tem 10 ou 11 dígitos (DDD + número), adiciona +55
      if (numero.length >= 10 && numero.length <= 11) {
        return '+55' + numero;
      }
      // Fallback: retorna com +55 de qualquer forma
      return '+55' + numero;
    };

    const senderPhone = formatarTelefone(config.telefone || '11999999999');
    console.log('Telefone remetente formatado:', senderPhone);

    // Criar pedido na Lalamove
    const orderResult = await lalamoveClient.createOrder({
      quotationId: quotation.quotationId,
      sender: {
        stopId: senderStopId,
        name: config.nomeEmpresa || 'Mirella Doces',
        phone: senderPhone
      },
      recipients: pedidosOrdenados.map((pedido, index) => ({
        stopId: recipientStopIds[index] || String(index + 1),
        name: pedido.nomeRecebedor,
        phone: formatarTelefone(pedido.telefone),
        remarks: pedido.descricao || undefined
      }))
    });

    if (!orderResult.success) {
      console.error('Erro ao criar pedido Lalamove:', orderResult.error);
      return NextResponse.json(
        { error: `Erro Lalamove: ${orderResult.error}` },
        { status: 400 }
      );
    }

    const lalamoveOrder = orderResult.data;
    console.log('Pedido Lalamove criado:', lalamoveOrder);

    // Atualizar rota com dados do Lalamove
    const rotaAtualizada = await db.rota.update({
      where: { id: params.id },
      data: {
        lalamoveOrderId: lalamoveOrder.orderId,
        lalamoveStatus: lalamoveOrder.status || 'ASSIGNING_DRIVER',
        lalamoveQuotationId: quotation.quotationId,
        lalamoveServiceType: serviceType,
        lalamovePrice: lalamoveOrder.price?.total ? parseFloat(lalamoveOrder.price.total) : null,
        lalamoveChamadoEm: new Date(),
        status: 'Em Andamento'
      }
    });

    // Atualizar status dos pedidos
    await db.pedido.updateMany({
      where: { rotaId: params.id },
      data: { statusProducao: 'Em Rota' }
    });

    return NextResponse.json({
      success: true,
      orderId: lalamoveOrder.orderId,
      status: lalamoveOrder.status,
      rota: rotaAtualizada
    });
  } catch (error: any) {
    console.error('Erro ao chamar veículo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao chamar veículo' },
      { status: 500 }
    );
  }
}
