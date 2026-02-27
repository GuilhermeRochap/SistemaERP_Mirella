import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { agruparPedidos } from '@/lib/route-optimizer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { pedidoIds } = await request?.json?.();

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

    const origemConfig = config?.latitude && config?.longitude
      ? { latitude: config.latitude, longitude: config.longitude }
      : undefined;

    // Buscar pedidos selecionados
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        id: { in: pedidoIds },
        statusProducao: 'Concluído',
        rotaId: null,
      },
    }) ?? [];

    if (pedidos?.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido disponível para otimização' },
        { status: 404 }
      );
    }

    // Agrupar e otimizar rotas
    const grupos = await agruparPedidos(pedidos?.map?.((p: any) => ({
      id: p?.id ?? '',
      latitude: p?.latitude ?? 0,
      longitude: p?.longitude ?? 0,
      peso: p?.peso ?? 0,
      altura: p?.altura ?? 0,
      largura: p?.largura ?? 0,
      profundidade: p?.profundidade ?? 0,
      dataEntrega: p?.dataEntrega ?? new Date(),
      horaEntrega: p?.horaEntrega ?? '00:00',
      status: p?.status ?? '',
    })) ?? [], origemConfig);

    // Criar rotas no banco
    const rotasCriadas = [];
    for (const grupo of grupos ?? []) {
      const rota = await db?.rota?.create?.({
        data: {
          data: new Date(),
          tipoVeiculo: grupo?.tipoVeiculo ?? 'Moto',
          pesoTotal: grupo?.pesoTotal ?? 0,
          distanciaTotal: grupo?.distanciaTotal ?? 0,
          tempoEstimadoTotal: grupo?.tempoEstimado ?? 0,
          ordem: grupo?.ordem ?? [],
        },
      });

      // Atualizar pedidos com a rota
      const pedidoIdsGrupo = grupo?.pedidos?.map?.(p => p?.id ?? '') ?? [];
      await db?.pedido?.updateMany?.({
        where: {
          id: { in: pedidoIdsGrupo },
        },
        data: {
          rotaId: rota?.id,
          statusProducao: 'Em Rota',
        },
      });

      // Buscar pedidos atualizados com dados completos
      const pedidosCompletos = await db?.pedido?.findMany?.({
        where: {
          id: { in: pedidoIdsGrupo },
        },
      }) ?? [];

      rotasCriadas.push({
        ...rota,
        pedidos: pedidosCompletos,
      });
    }

    return NextResponse.json(rotasCriadas);
  } catch (error) {
    console.error('Erro ao otimizar rotas:', error);
    return NextResponse.json(
      { error: 'Erro ao otimizar rotas' },
      { status: 500 }
    );
  }
}
