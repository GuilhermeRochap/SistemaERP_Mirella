import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geoapifyClient } from '@/lib/geoapify-client';

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

    if (!tipoVeiculo || !['Moto', 'Carro', 'Van'].includes(tipoVeiculo)) {
      return NextResponse.json(
        { error: 'Tipo de veículo inválido' },
        { status: 400 }
      );
    }

    // Buscar configuração de origem
    const config = await db?.configuracao?.findUnique?.({
      where: { id: 'config_principal' },
    });

    const origem = config?.latitude && config?.longitude
      ? { lat: config.latitude, lng: config.longitude }
      : { lat: -23.5505, lng: -46.6333 }; // São Paulo padrão

    // Buscar pedidos selecionados
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        id: { in: pedidoIds },
        statusProducao: 'Concluído',
        rotaId: null,
      },
    }) ?? [];

    if (pedidos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido válido encontrado' },
        { status: 404 }
      );
    }

    // Calcular peso total
    const pesoTotal = pedidos.reduce((acc, p) => acc + (p?.peso ?? 0), 0);

    // Otimizar ordem dos pedidos usando coordenadas
    const waypoints = pedidos
      .filter(p => p?.latitude && p?.longitude)
      .map(p => ({
        lat: p?.latitude ?? 0,
        lng: p?.longitude ?? 0,
        id: p?.id ?? ''
      }));

    let distanciaTotal = 0;
    let tempoEstimado = 0;
    let ordem: string[] = pedidos.map(p => p.id);

    if (waypoints.length > 0) {
      try {
        const rotaOtimizada = await geoapifyClient.otimizarRota(origem, waypoints);
        if (rotaOtimizada) {
          ordem = rotaOtimizada.ordem ?? ordem;
          distanciaTotal = rotaOtimizada.distanciaTotal ?? 0;
          tempoEstimado = rotaOtimizada.tempoTotal ?? 0;
        }
      } catch (error) {
        console.error('Erro ao otimizar rota:', error);
        // Fallback: calcular distância aproximada
        distanciaTotal = waypoints.length * 2; // Estimativa básica
        tempoEstimado = waypoints.length * 10; // 10 min por parada
      }
    } else {
      tempoEstimado = 15; // Tempo base para uma entrega
    }

    // Criar rota no banco
    const rota = await db?.rota?.create?.({
      data: {
        data: new Date(),
        tipoVeiculo,
        pesoTotal,
        distanciaTotal,
        tempoEstimadoTotal: tempoEstimado,
        ordem,
      },
    });

    // Atualizar pedidos com a rota
    await db?.pedido?.updateMany?.({
      where: {
        id: { in: pedidoIds },
      },
      data: {
        rotaId: rota?.id,
        statusProducao: 'Em Rota',
      },
    });

    // Buscar pedidos atualizados
    const pedidosAtualizados = await db?.pedido?.findMany?.({
      where: {
        id: { in: pedidoIds },
      },
    }) ?? [];

    return NextResponse.json({
      ...rota,
      pedidos: pedidosAtualizados,
    });
  } catch (error) {
    console.error('Erro ao criar rota manual:', error);
    return NextResponse.json(
      { error: 'Erro ao criar rota' },
      { status: 500 }
    );
  }
}
