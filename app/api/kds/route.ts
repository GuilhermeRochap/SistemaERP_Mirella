import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataFiltro = searchParams.get('data'); // formato: YYYY-MM-DD

    // Montar filtro de data se fornecido
    let whereData = {};
    if (dataFiltro) {
      const inicio = new Date(`${dataFiltro}T00:00:00.000Z`);
      const fim = new Date(`${dataFiltro}T23:59:59.999Z`);
      whereData = { dataEntrega: { gte: inicio, lte: fim } };
    }

    const pedidos = await db?.pedido?.findMany?.({
      where: {
        statusProducao: {
          in: ['Aguardando Produção', 'Em Produção', 'Pausado', 'Concluído'],
        },
        ...whereData,
      },
      orderBy: [
        { status: 'asc' }, // Urgente primeiro
        { dataEntrega: 'asc' },
        { horaEntrega: 'asc' },
      ],
    }) ?? [];

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos do KDS:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { pedidoId, acao, tempoDecorrido } = await request?.json?.();

    const pedido = await db?.pedido?.findUnique?.({
      where: { id: pedidoId },
    });

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    let novoStatus = pedido?.statusProducao;
    let dadosAtualizacao: any = {};

    switch (acao) {
      case 'iniciar':
        novoStatus = 'Em Produção';
        dadosAtualizacao.inicioProducao = new Date();
        dadosAtualizacao.tempoPausado = 0; // Reset tempo pausado ao iniciar
        break;
      case 'pausar':
        novoStatus = 'Pausado';
        // Salva o tempo decorrido enviado pelo frontend
        if (typeof tempoDecorrido === 'number') {
          dadosAtualizacao.tempoPausado = tempoDecorrido;
        }
        break;
      case 'retomar':
        novoStatus = 'Em Produção';
        // Mantém o tempo pausado e recalcula o início
        // O novo inicioProducao = agora - tempoPausado (em ms)
        const tempoPausadoAtual = pedido?.tempoPausado || 0;
        dadosAtualizacao.inicioProducao = new Date(Date.now() - (tempoPausadoAtual * 1000));
        break;
      case 'concluir':
        novoStatus = 'Concluído';
        dadosAtualizacao.fimProducao = new Date();
        // Salva o tempo total de produção
        if (typeof tempoDecorrido === 'number') {
          dadosAtualizacao.tempoPausado = tempoDecorrido;
        }
        break;
      case 'voltar-kds':
        novoStatus = 'Aguardando Produção';
        dadosAtualizacao.fimProducao = null;
        dadosAtualizacao.inicioProducao = null;
        dadosAtualizacao.tempoPausado = 0;
        dadosAtualizacao.rotaId = null;
        break;
      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        );
    }

    const pedidoAtualizado = await db?.pedido?.update?.({
      where: { id: pedidoId },
      data: {
        statusProducao: novoStatus,
        ...dadosAtualizacao,
      },
    });

    // Se o pedido foi removido de uma rota (voltar-kds), verificar se a rota ficou vazia e apagá-la
    if (acao === 'voltar-kds' && pedido.rotaId) {
      const remainingPedidos = await db.pedido.count({
        where: { rotaId: pedido.rotaId }
      });
      if (remainingPedidos === 0) {
        try {
          await db.rota.delete({
            where: { id: pedido.rotaId }
          });
          console.log(`[KDS] Rota ${pedido.rotaId} apagada pois ficou vazia.`);
        } catch (err) {
          console.error(`[KDS] Erro ao tentar apagar rota vazia ${pedido.rotaId}:`, err);
        }
      }
    }

    // Criar histórico
    await db?.historicoStatus?.create?.({
      data: {
        pedidoId: pedidoId,
        statusAnterior: pedido?.statusProducao,
        statusNovo: novoStatus,
      },
    });

    return NextResponse.json(pedidoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pedido' },
      { status: 500 }
    );
  }
}
