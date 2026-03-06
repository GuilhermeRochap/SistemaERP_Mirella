import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

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

        // Não permite cancelar via esta rota se já tem veículo Lalamove ativo
        if (rota.lalamoveOrderId) {
            return NextResponse.json(
                { error: 'Esta rota possui veículo Lalamove. Use "Cancelar Veículo" primeiro.' },
                { status: 400 }
            );
        }

        // Desvincula os pedidos da rota e volta ao Otimizador
        await db.pedido.updateMany({
            where: { rotaId: params.id },
            data: {
                statusProducao: 'Concluído',
                rotaId: null,
            },
        });

        // Excluir a rota
        await db.rota.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            success: true,
            message: 'Rota cancelada. Os pedidos voltaram ao Otimizador.',
        });
    } catch (error: any) {
        console.error('Erro ao cancelar rota:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao cancelar rota' },
            { status: 500 }
        );
    }
}
