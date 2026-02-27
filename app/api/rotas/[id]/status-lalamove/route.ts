import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as lalamoveClient from '@/lib/lalamove-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rota = await db.rota.findUnique({
      where: { id: params.id }
    });

    if (!rota) {
      return NextResponse.json(
        { error: 'Rota não encontrada' },
        { status: 404 }
      );
    }

    if (!rota.lalamoveOrderId) {
      return NextResponse.json({
        status: 'NAO_CHAMADO',
        message: 'Veículo ainda não foi chamado para esta rota'
      });
    }

    // Buscar status na Lalamove
    const lalamoveStatus = await lalamoveClient.getOrderStatus(rota.lalamoveOrderId);
    
    console.log('Status Lalamove:', lalamoveStatus);

    // Atualizar banco com dados mais recentes
    const dadosAtualizacao: any = {
      lalamoveStatus: lalamoveStatus.status
    };

    // Extrair dados do motorista se disponíveis
    if (lalamoveStatus.driver) {
      dadosAtualizacao.lalamoveDriverName = lalamoveStatus.driver.name;
      dadosAtualizacao.lalamoveDriverPhone = lalamoveStatus.driver.phone;
      dadosAtualizacao.lalamovePlateNumber = lalamoveStatus.driver.plateNumber;
    }

    // Atualizar status da rota baseado no Lalamove
    if (lalamoveStatus.status === 'COMPLETED') {
      dadosAtualizacao.status = 'Concluída';
      // Atualizar pedidos para Entregue
      await db.pedido.updateMany({
        where: { rotaId: params.id },
        data: { statusProducao: 'Entregue' }
      });
    } else if (lalamoveStatus.status === 'CANCELED' || lalamoveStatus.status === 'REJECTED') {
      dadosAtualizacao.status = 'Cancelada';
    }

    await db.rota.update({
      where: { id: params.id },
      data: dadosAtualizacao
    });

    return NextResponse.json({
      orderId: rota.lalamoveOrderId,
      status: lalamoveStatus.status,
      statusDescricao: getStatusDescricao(lalamoveStatus.status),
      shareLink: rota.lalamoveShareLink,
      driver: lalamoveStatus.driver || null,
      priceBreakdown: lalamoveStatus.priceBreakdown || null,
      chamadoEm: rota.lalamoveChamadoEm,
      serviceType: rota.lalamoveServiceType
    });
  } catch (error: any) {
    console.error('Erro ao verificar status Lalamove:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar status' },
      { status: 500 }
    );
  }
}

function getStatusDescricao(status: string): string {
  const descricoes: Record<string, string> = {
    'ASSIGNING_DRIVER': 'Procurando motorista...',
    'ON_GOING': 'Motorista a caminho da coleta',
    'PICKED_UP': 'Pedido coletado, em rota de entrega',
    'COMPLETED': 'Entrega concluída',
    'CANCELED': 'Pedido cancelado',
    'REJECTED': 'Pedido rejeitado',
    'EXPIRED': 'Pedido expirado'
  };
  return descricoes[status] || status;
}
