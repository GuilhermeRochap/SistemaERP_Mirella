import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        statusProducao: {
          in: ['Aguardando Produção', 'Em Produção', 'Pausado', 'Concluído'],
        },
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
