import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Buscar pedidos disponíveis para rota (concluídos e sem rota atribuída)
export async function GET() {
  try {
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        statusProducao: 'Concluído',
        rotaId: null,
      },
      orderBy: [
        { status: 'desc' }, // Urgente primeiro
        { dataEntrega: 'asc' },
        { horaEntrega: 'asc' },
      ],
    }) ?? [];

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos disponíveis' },
      { status: 500 }
    );
  }
}
