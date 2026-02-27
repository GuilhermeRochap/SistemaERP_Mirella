import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lalamoveClient, LalamoveStop } from '@/lib/lalamove-client';

export const dynamic = 'force-dynamic';

const MAX_DISTANCIA_GRUPO = 10; // km
const MAX_PEDIDOS_GRUPO = 10; // máximo de pedidos por grupo

interface PedidoComCoordenadas {
  id: string;
  nomeRecebedor: string;
  endereco: string;
  numero: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
  peso: number;
  horaEntrega: string;
}

interface GrupoCotacao {
  grupoId: number;
  pedidos: PedidoComCoordenadas[];
  pesoTotal: number;
  tipoVeiculoSugerido: string;
  cotacoes: any[];
  origem: {
    latitude: number;
    longitude: number;
    endereco: string;
  };
  destinos: {
    latitude: number;
    longitude: number;
    endereco: string;
    nomeRecebedor: string;
  }[];
}

// Fórmula de Haversine para cálculo de distância
function calcularDistanciaHaversine(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function determinarTipoVeiculo(peso: number): string {
  if (peso <= 30) return 'Moto';
  if (peso <= 200) return 'Carro';
  return 'Van';
}

// Agrupar pedidos por proximidade (máx 10km) e máximo de pedidos por grupo
function agruparPorProximidade(pedidos: PedidoComCoordenadas[]): PedidoComCoordenadas[][] {
  if (pedidos.length === 0) return [];
  
  const grupos: PedidoComCoordenadas[][] = [];
  const naoAgrupados = [...pedidos];

  while (naoAgrupados.length > 0) {
    const pedidoBase = naoAgrupados.shift()!;
    const grupo: PedidoComCoordenadas[] = [pedidoBase];

    for (let i = naoAgrupados.length - 1; i >= 0; i--) {
      // Verificar limite de pedidos por grupo
      if (grupo.length >= MAX_PEDIDOS_GRUPO) break;
      
      const pedido = naoAgrupados[i];
      
      // Verificar se está dentro da distância máxima de TODOS os pedidos do grupo
      const dentroDoLimite = grupo.every(p => {
        const distancia = calcularDistanciaHaversine(
          { lat: p.latitude, lng: p.longitude },
          { lat: pedido.latitude, lng: pedido.longitude }
        );
        return distancia <= MAX_DISTANCIA_GRUPO;
      });

      if (dentroDoLimite) {
        grupo.push(pedido);
        naoAgrupados.splice(i, 1);
      }
    }

    grupos.push(grupo);
  }

  return grupos;
}

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

    if (!config?.latitude || !config?.longitude || !config?.endereco) {
      return NextResponse.json(
        { error: 'Configure o endereço de origem nas Configurações' },
        { status: 400 }
      );
    }

    // Buscar pedidos selecionados
    const pedidos = await db?.pedido?.findMany?.({
      where: {
        id: { in: pedidoIds },
      },
    }) ?? [];

    if (pedidos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido encontrado' },
        { status: 404 }
      );
    }

    // Filtrar pedidos com coordenadas válidas
    const pedidosComCoordenadas: PedidoComCoordenadas[] = pedidos
      .filter(p => p.latitude && p.longitude)
      .map(p => ({
        id: p.id,
        nomeRecebedor: p.nomeRecebedor,
        endereco: p.endereco,
        numero: p.numero,
        bairro: p.bairro,
        cidade: p.cidade,
        estado: p.estado,
        cep: p.cep,
        latitude: p.latitude!,
        longitude: p.longitude!,
        peso: p.peso ?? 0,
        horaEntrega: p.horaEntrega ?? '00:00',
      }));

    if (pedidosComCoordenadas.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum pedido com coordenadas válidas' },
        { status: 400 }
      );
    }

    // Agrupar pedidos por proximidade (máx 10km)
    const gruposPedidos = agruparPorProximidade(pedidosComCoordenadas);

    console.log(`Criados ${gruposPedidos.length} grupo(s) de ${pedidosComCoordenadas.length} pedidos`);

    // Para cada grupo, buscar cotações da Lalamove
    const gruposCotacao: GrupoCotacao[] = [];

    for (let i = 0; i < gruposPedidos.length; i++) {
      const grupoPedidos = gruposPedidos[i];
      const pesoTotal = grupoPedidos.reduce((acc, p) => acc + p.peso, 0);
      const tipoVeiculoSugerido = determinarTipoVeiculo(pesoTotal);

      // Montar stops para Lalamove
      const stops: LalamoveStop[] = [
        {
          coordinates: {
            lat: config.latitude.toString(),
            lng: config.longitude.toString(),
          },
          address: `${config.endereco}, ${config.numero ?? ''} - ${config.bairro ?? ''}, ${config.cidade ?? ''} - ${config.estado ?? ''}, ${config.cep ?? ''}`,
        },
        ...grupoPedidos.map(p => ({
          coordinates: {
            lat: p.latitude.toString(),
            lng: p.longitude.toString(),
          },
          address: `${p.endereco}, ${p.numero ?? ''} - ${p.bairro}, ${p.cidade} - ${p.estado}, ${p.cep}`,
        })),
      ];

      // Buscar cotações para todos os tipos de veículo
      const allQuotations = await lalamoveClient.getAllQuotations(stops, undefined);

      const cotacoes = allQuotations
        .filter(q => q.quotation !== null)
        .map(q => ({
          serviceType: q.serviceType,
          vehicleName: lalamoveClient.getVehicleName(q.serviceType),
          quotationId: q.quotation!.quotationId,
          price: q.quotation!.priceBreakdown.total,
          priceFormatted: lalamoveClient.formatPrice(
            q.quotation!.priceBreakdown.total,
            q.quotation!.priceBreakdown.currency
          ),
          currency: q.quotation!.priceBreakdown.currency,
          expiresAt: q.quotation!.expiresAt,
          distance: q.quotation!.distance,
        }));

      gruposCotacao.push({
        grupoId: i + 1,
        pedidos: grupoPedidos,
        pesoTotal,
        tipoVeiculoSugerido,
        cotacoes,
        origem: {
          latitude: config.latitude,
          longitude: config.longitude,
          endereco: `${config.endereco}, ${config.numero ?? ''} - ${config.bairro ?? ''}, ${config.cidade ?? ''}`,
        },
        destinos: grupoPedidos.map(p => ({
          latitude: p.latitude,
          longitude: p.longitude,
          endereco: `${p.endereco}, ${p.numero ?? ''} - ${p.bairro}`,
          nomeRecebedor: p.nomeRecebedor,
        })),
      });
    }

    return NextResponse.json({
      grupos: gruposCotacao,
      totalPedidos: pedidosComCoordenadas.length,
      totalGrupos: gruposCotacao.length,
    });
  } catch (error) {
    console.error('Erro ao obter cotação agrupada:', error);
    return NextResponse.json(
      { error: 'Erro ao obter cotação' },
      { status: 500 }
    );
  }
}
