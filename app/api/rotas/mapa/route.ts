import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rotaId = searchParams.get('rotaId');

    if (!rotaId) {
      return NextResponse.json(
        { error: 'ID da rota não fornecido' },
        { status: 400 }
      );
    }

    // Buscar rota com pedidos
    const rota = await db?.rota?.findUnique?.({
      where: { id: rotaId },
      include: {
        pedidos: true,
      },
    });

    if (!rota) {
      return NextResponse.json(
        { error: 'Rota não encontrada' },
        { status: 404 }
      );
    }

    // Buscar configuração de origem
    const config = await db?.configuracao?.findUnique?.({
      where: { id: 'config_principal' },
    });

    if (!config?.latitude || !config?.longitude) {
      return NextResponse.json(
        { error: 'Endereço de origem não configurado' },
        { status: 400 }
      );
    }

    // Montar origem e destinos
    const origem = {
      latitude: config.latitude,
      longitude: config.longitude,
      endereco: `${config.endereco}, ${config.numero} - ${config.bairro}, ${config.cidade}`,
    };

    const destinos = rota.pedidos
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        id: p.id,
        latitude: p.latitude!,
        longitude: p.longitude!,
        endereco: `${p.endereco}, ${p.numero} - ${p.bairro}, ${p.cidade}`,
        nomeRecebedor: p.nomeRecebedor,
      }));

    return NextResponse.json({
      origem,
      destinos,
      rota: {
        id: rota.id,
        tipoVeiculo: rota.tipoVeiculo,
        distanciaTotal: rota.distanciaTotal,
        tempoEstimadoTotal: rota.tempoEstimadoTotal,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar dados do mapa:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados do mapa' },
      { status: 500 }
    );
  }
}
