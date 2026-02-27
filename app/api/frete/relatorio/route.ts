import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request?.url ?? '');
    const mes = searchParams?.get?.('mes'); // formato: 2025-01
    const ano = searchParams?.get?.('ano'); // formato: 2025

    // Se não passar parâmetros, retorna últimos 12 meses
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date;

    if (mes) {
      const [anoParam, mesParam] = mes.split('-').map(Number);
      dataInicio = new Date(anoParam, mesParam - 1, 1);
      dataFim = new Date(anoParam, mesParam, 0, 23, 59, 59);
    } else if (ano) {
      dataInicio = new Date(parseInt(ano), 0, 1);
      dataFim = new Date(parseInt(ano), 11, 31, 23, 59, 59);
    } else {
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
      dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    }

    // Buscar todos os pedidos no período
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        createdAt: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
      select: {
        id: true,
        valorFretePago: true,
        valorFreteReal: true,
        createdAt: true,
      },
    }) ?? [];

    // Agrupar por mês
    const porMes: Record<string, {
      totalPagoCliente: number;
      totalCustoReal: number;
      diferenca: number;
      quantidade: number;
    }> = {};

    pedidos.forEach((pedido) => {
      const data = new Date(pedido.createdAt);
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      
      if (!porMes[chave]) {
        porMes[chave] = {
          totalPagoCliente: 0,
          totalCustoReal: 0,
          diferenca: 0,
          quantidade: 0,
        };
      }

      const pago = pedido.valorFretePago ?? 0;
      const real = pedido.valorFreteReal ?? 0;

      porMes[chave].totalPagoCliente += pago;
      porMes[chave].totalCustoReal += real;
      porMes[chave].diferenca += (pago - real);
      porMes[chave].quantidade += 1;
    });

    // Converter para array e ordenar
    const meses = Object.entries(porMes)
      .map(([mes, dados]) => ({
        mes,
        mesFormatado: formatarMes(mes),
        ...dados,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Calcular totais
    const totalGeral = {
      totalPagoCliente: meses.reduce((acc, m) => acc + m.totalPagoCliente, 0),
      totalCustoReal: meses.reduce((acc, m) => acc + m.totalCustoReal, 0),
      diferenca: meses.reduce((acc, m) => acc + m.diferenca, 0),
      quantidade: meses.reduce((acc, m) => acc + m.quantidade, 0),
    };

    return NextResponse.json({
      meses,
      totalGeral,
      periodo: {
        inicio: dataInicio.toISOString(),
        fim: dataFim.toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de frete:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar relatório de frete' },
      { status: 500 }
    );
  }
}

function formatarMes(mes: string): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const [ano, mesNum] = mes.split('-');
  return `${meses[parseInt(mesNum) - 1]}/${ano}`;
}
