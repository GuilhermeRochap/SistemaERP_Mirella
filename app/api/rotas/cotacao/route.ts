import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lalamoveClient, LalamoveStop, LalamoveServiceType } from '@/lib/lalamove-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { pedidoIds, tipoVeiculo } = await request?.json?.();

    if (!pedidoIds || pedidoIds.length === 0) {
      return NextResponse.json(
        { error: 'Selecione pelo menos um pedido' },
        { status: 400 }
      );
    }

    // Buscar configuração de origem
    const config = await db?.configuracao?.findUnique?.({
      where: { id: 'config_principal' },
    });

    if (!config?.latitude || !config?.longitude || !config?.endereco) {
      return NextResponse.json(
        { error: 'Configure o endereço de origem nas Configurações' },
        { status: 400 }
      );
    }

    // Buscar pedidos selecionados
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        id: { in: pedidoIds },
      },
    }) ?? [];

    if (pedidos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido encontrado' },
        { status: 404 }
      );
    }

    // Montar stops para Lalamove
    const stops: LalamoveStop[] = [
      // Origem (ponto de coleta)
      {
        coordinates: {
          lat: config.latitude.toString(),
          lng: config.longitude.toString(),
        },
        address: `${config.endereco}, ${config.numero ?? ''} - ${config.bairro ?? ''}, ${config.cidade ?? ''} - ${config.estado ?? ''}, ${config.cep ?? ''}`,
      },
      // Destinos (pontos de entrega)
      ...pedidos
        .filter(p => p.latitude && p.longitude)
        .map(p => ({
          coordinates: {
            lat: p.latitude!.toString(),
            lng: p.longitude!.toString(),
          },
          address: `${p.endereco}, ${p.numero ?? ''} - ${p.bairro}, ${p.cidade} - ${p.estado}, ${p.cep}`,
        })),
    ];

    // Debug: log das coordenadas enviadas
    console.log('=== DEBUG LALAMOVE ===');
    console.log('Origem:', config.latitude, config.longitude, config.cidade);
    console.log('Destinos:', pedidos.map(p => ({ lat: p.latitude, lng: p.longitude, cidade: p.cidade })));
    console.log('Stops para API:', JSON.stringify(stops, null, 2));

    if (stops.length < 2) {
      return NextResponse.json(
        { error: 'Pedidos sem coordenadas válidas' },
        { status: 400 }
      );
    }

    // Calcular peso total
    const pesoTotal = pedidos.reduce((acc, p) => acc + (p.peso ?? 0), 0);

    // Se tipo específico, buscar apenas essa cotação
    if (tipoVeiculo) {
      const serviceType = lalamoveClient.mapVehicleToLalamove(tipoVeiculo, pesoTotal);
      const quotation = await lalamoveClient.getQuotation(
        serviceType,
        stops,
        undefined,
        stops.length > 2
      );

      if (!quotation) {
        return NextResponse.json(
          { error: 'Não foi possível obter cotação da Lalamove' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        quotations: [{
          serviceType: quotation.serviceType,
          vehicleName: lalamoveClient.getVehicleName(quotation.serviceType),
          quotationId: quotation.quotationId,
          price: quotation.priceBreakdown.total,
          priceFormatted: lalamoveClient.formatPrice(quotation.priceBreakdown.total, quotation.priceBreakdown.currency),
          currency: quotation.priceBreakdown.currency,
          expiresAt: quotation.expiresAt,
          distance: quotation.distance,
          priceBreakdown: quotation.priceBreakdown,
        }],
        pesoTotal,
        qtdPedidos: pedidos.length,
        qtdParadas: stops.length - 1,
      });
    }

    // Buscar cotações para todos os tipos de veículo
    const allQuotations = await lalamoveClient.getAllQuotations(
      stops,
      undefined
    );

    const quotations = allQuotations
      .filter(q => q.quotation !== null)
      .map(q => ({
        serviceType: q.serviceType,
        vehicleName: lalamoveClient.getVehicleName(q.serviceType),
        quotationId: q.quotation!.quotationId,
        price: q.quotation!.priceBreakdown.total,
        priceFormatted: lalamoveClient.formatPrice(q.quotation!.priceBreakdown.total, q.quotation!.priceBreakdown.currency),
        currency: q.quotation!.priceBreakdown.currency,
        expiresAt: q.quotation!.expiresAt,
        distance: q.quotation!.distance,
        priceBreakdown: q.quotation!.priceBreakdown,
      }));

    return NextResponse.json({
      quotations,
      pesoTotal,
      qtdPedidos: pedidos.length,
      qtdParadas: stops.length - 1,
    });
  } catch (error) {
    console.error('Erro ao obter cotação:', error);
    return NextResponse.json(
      { error: 'Erro ao obter cotação' },
      { status: 500 }
    );
  }
}
