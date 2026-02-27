// Algoritmo de agrupamento e otimização de rotas usando Geoapify

import { geoapifyClient, Coordenadas } from './geoapify-client';

export interface Pedido {
  id: string;
  latitude: number;
  longitude: number;
  peso: number;
  altura: number;
  largura: number;
  profundidade: number;
  dataEntrega: Date;
  horaEntrega: string;
  status: string;
  nomeRecebedor?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
}

export interface GrupoPedidos {
  pedidos: Pedido[];
  tipoVeiculo: 'Moto' | 'Carro' | 'Van';
  pesoTotal: number;
  ordem: string[];
  distanciaTotal: number;
  tempoEstimado: number;
}

const MAX_DISTANCIA_GRUPO = 10; // km
const MAX_DIFERENCA_HORARIO = 2; // horas

export async function agruparPedidos(
  pedidos: Pedido[],
  origemConfig?: { latitude: number; longitude: number }
): Promise<GrupoPedidos[]> {
  if (!pedidos || pedidos?.length === 0) return [];

  // Filtrar pedidos com coordenadas válidas
  const pedidosValidos = pedidos.filter(p => p?.latitude && p?.longitude);
  if (pedidosValidos.length === 0) return [];

  const grupos: GrupoPedidos[] = [];
  const pedidosNaoAgrupados = [...pedidosValidos];

  // Origem padrão (São Paulo centro) se não configurada
  const origem: Coordenadas = origemConfig 
    ? { lat: origemConfig.latitude, lng: origemConfig.longitude }
    : { lat: -23.5505, lng: -46.6333 };

  while (pedidosNaoAgrupados?.length > 0) {
    const pedidoBase = pedidosNaoAgrupados?.shift?.();
    if (!pedidoBase) continue;

    const grupo: Pedido[] = [pedidoBase];
    let pesoTotal = pedidoBase?.peso ?? 0;

    // Tentar adicionar mais pedidos ao grupo
    for (let i = pedidosNaoAgrupados?.length - 1; i >= 0; i--) {
      const pedido = pedidosNaoAgrupados?.[i];
      if (!pedido) continue;

      // Verificar se é urgente e se o grupo já tem pedidos urgentes
      const grupoTemUrgente = grupo?.some?.(p => p?.status === 'Urgente');
      const pedidoEhUrgente = pedido?.status === 'Urgente';

      if (grupoTemUrgente && !pedidoEhUrgente) continue;
      if (!grupoTemUrgente && pedidoEhUrgente && grupo?.length > 1) continue;

      // Verificar diferença de horário
      const diferencaHoras = calcularDiferencaHorario(
        pedidoBase?.horaEntrega ?? '00:00',
        pedido?.horaEntrega ?? '00:00'
      );
      if (diferencaHoras > MAX_DIFERENCA_HORARIO) continue;

      // Verificar distância usando Haversine (rápido)
      const distancia = calcularDistanciaHaversine(
        { lat: pedidoBase?.latitude ?? 0, lng: pedidoBase?.longitude ?? 0 },
        { lat: pedido?.latitude ?? 0, lng: pedido?.longitude ?? 0 }
      );
      if (distancia > MAX_DISTANCIA_GRUPO) continue;

      // Verificar se o peso permite adicionar ao grupo
      const novoPeso = pesoTotal + (pedido?.peso ?? 0);

      // Adicionar ao grupo
      grupo.push(pedido);
      pesoTotal = novoPeso;
      pedidosNaoAgrupados.splice(i, 1);
    }

    // Otimizar a ordem dos pedidos no grupo usando Geoapify
    const waypoints = grupo?.map?.(p => ({
      lat: p?.latitude ?? 0,
      lng: p?.longitude ?? 0,
      id: p?.id ?? ''
    })) ?? [];

    let rotaOtimizada;
    try {
      rotaOtimizada = await geoapifyClient.otimizarRota(origem, waypoints);
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      // Fallback local
      rotaOtimizada = otimizarRotaLocal(origem, waypoints);
    }

    grupos.push({
      pedidos: grupo,
      tipoVeiculo: determinarTipoVeiculo(pesoTotal),
      pesoTotal,
      ordem: rotaOtimizada?.ordem ?? waypoints.map(w => w.id),
      distanciaTotal: rotaOtimizada?.distanciaTotal ?? 0,
      tempoEstimado: rotaOtimizada?.tempoTotal ?? 0,
    });
  }

  return grupos;
}

function determinarTipoVeiculo(peso: number): 'Moto' | 'Carro' | 'Van' {
  if (peso <= 30) return 'Moto';
  if (peso <= 200) return 'Carro';
  return 'Van';
}

function calcularDiferencaHorario(hora1: string, hora2: string): number {
  const [h1, m1] = (hora1?.split?.(':') ?? ['0', '0']).map(Number);
  const [h2, m2] = (hora2?.split?.(':') ?? ['0', '0']).map(Number);
  
  const minutos1 = (h1 * 60) + m1;
  const minutos2 = (h2 * 60) + m2;
  
  return Math.abs((minutos1 - minutos2) / 60);
}

// Fórmula de Haversine para cálculo rápido de distância
function calcularDistanciaHaversine(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number }
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Otimização local usando algoritmo do vizinho mais próximo
function otimizarRotaLocal(
  origem: { lat: number; lng: number },
  waypoints: { id: string; lat: number; lng: number }[]
): { ordem: string[]; distanciaTotal: number; tempoTotal: number } {
  const naoVisitados = [...waypoints];
  const ordem: string[] = [];
  let pontoAtual = origem;
  let distanciaTotal = 0;
  let tempoTotal = 0;

  while (naoVisitados.length > 0) {
    let menorDistancia = Infinity;
    let indiceProximo = 0;

    for (let i = 0; i < naoVisitados.length; i++) {
      const dist = calcularDistanciaHaversine(pontoAtual, {
        lat: naoVisitados[i].lat,
        lng: naoVisitados[i].lng,
      });
      if (dist < menorDistancia) {
        menorDistancia = dist;
        indiceProximo = i;
      }
    }

    const proximo = naoVisitados[indiceProximo];
    ordem.push(proximo.id);
    distanciaTotal += menorDistancia;
    tempoTotal += Math.ceil((menorDistancia / 30) * 60) + 5; // 30km/h + 5min por parada
    pontoAtual = { lat: proximo.lat, lng: proximo.lng };
    naoVisitados.splice(indiceProximo, 1);
  }

  return { ordem, distanciaTotal, tempoTotal };
}

export function calcularTempoInicioProducao(
  horaEntrega: string,
  tempoProducao: number
): string {
  const [hora, minuto] = (horaEntrega?.split?.(':') ?? ['0', '0']).map(Number);
  const totalMinutos = (hora * 60) + minuto - tempoProducao;
  
  const novaHora = Math.floor(totalMinutos / 60);
  const novoMinuto = totalMinutos % 60;
  
  return `${String(novaHora)?.padStart?.(2, '0')}:${String(novoMinuto)?.padStart?.(2, '0')}`;
}
