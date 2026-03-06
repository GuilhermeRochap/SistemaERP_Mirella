import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as lalamoveClient from '@/lib/lalamove-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    for (const pedidoId of ordemIds) {
      const pedido = rota.pedidos.find(p => p.id === pedidoId);
      if (pedido?.latitude && pedido?.longitude) {
        stops.push({
          coordinates: {
            lat: String(pedido.latitude),
            lng: String(pedido.longitude)
          },
          address: `${pedido.endereco}, ${pedido.numero} - ${pedido.bairro}, ${pedido.cidade}/${pedido.estado}`
        });
      }
    }

    // Buscar cotações
    const cotacoes = await lalamoveClient.getAllQuotations(stops);

    return NextResponse.json({
      rotaId: rota.id,
      pesoTotal: rota.pesoTotal,
      qtdPedidos: rota.pedidos.length,
      cotacoes: cotacoes
        .filter(c => c.quotation !== null)
        .map(c => ({
          serviceType: c.serviceType,
          quotationId: c.quotation!.quotationId,
          preco: lalamoveClient.formatPrice(c.quotation!.priceBreakdown.total),
          expiresAt: c.quotation!.expiresAt,
          stops: c.quotation!.stops
        }))
    });
  } catch (error: any) {
    console.error('Erro ao buscar cotação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar cotação' },
      { status: 500 }
    );
  }
}
