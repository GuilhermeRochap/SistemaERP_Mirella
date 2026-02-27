import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request?.url ?? '');
    const data = searchParams?.get?.('data');
    const status = searchParams?.get?.('status');

    const where: any = {};

    if (data) {
      const dataInicio = new Date(data);
      const dataFim = new Date(data);
      dataFim.setDate(dataFim?.getDate?.() + 1);
      where.data = {
        gte: dataInicio,
        lt: dataFim,
      };
    }

    if (status) {
      where.status = status;
    }

    const rotas = await db?.rota?.findMany?.({
      where,
      include: {
        pedidos: true,
      },
      orderBy: { createdAt: 'desc' },
    }) ?? [];

    return NextResponse.json(rotas);
  } catch (error) {
    console.error('Erro ao buscar rotas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar rotas' },
      { status: 500 }
    );
  }
}
