import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as lalamoveClient from '@/lib/lalamove-client';

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Buscar a rota
        const rota = await db.rota.findUnique({
            where: { id: params.id },
        });

        if (!rota) {
            return NextResponse.json(
                { error: 'Rota não encontrada' },
                { status: 404 }
            );
        }

        if (!rota.lalamoveOrderId) {
            return NextResponse.json(
                { error: 'Esta rota não possui veículo solicitado' },
                { status: 400 }
            );
        }

        // Cancelar pedido na Lalamove
        const cancelado = await lalamoveClient.cancelOrder(rota.lalamoveOrderId);

        if (!cancelado) {
            return NextResponse.json(
                { error: 'Não foi possível cancelar o pedido na Lalamove. O motorista pode já ter aceito a corrida.' },
                { status: 400 }
            );
        }

        // Limpar dados do Lalamove na rota e reverter status
        const rotaAtualizada = await db.rota.update({
            where: { id: params.id },
            data: {
                lalamoveOrderId: null,
                lalamoveStatus: null,
                lalamoveQuotationId: null,
                lalamoveServiceType: null,
                lalamovePrice: null,
                lalamoveChamadoEm: null,
                status: 'Planejada',
            },
        });

        // Reverter status dos pedidos
        await db.pedido.updateMany({
            where: { rotaId: params.id },
            data: { statusProducao: 'Pronto' },
        });

        return NextResponse.json({
            success: true,
            message: 'Veículo cancelado com sucesso',
            rota: rotaAtualizada,
        });
    } catch (error: any) {
        console.error('Erro ao cancelar veículo:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao cancelar veículo' },
            { status: 500 }
        );
    }
}
