// Cliente Geoapify para geocoding, matriz de distâncias e roteamento

const GEOAPIFY_API_KEY = process.env.GEOAPIFY_API_KEY ?? '';
const BASE_URL = 'https://api.geoapify.com/v1';

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface EnderecoGeocodificado {
  latitude: number;
  longitude: number;
  enderecoFormatado: string;
  confianca: number;
}

export interface ResultadoMatriz {
  distanciaMetros: number;
  tempoSegundos: number;
}

export interface RotaOtimizada {
  ordem: string[];
  distanciaTotal: number; // km
  tempoTotal: number; // minutos
  geometria?: any;
}

// Geocodificação - Converte endereço em coordenadas
export async function geocodificarEndereco(
  endereco: string,
  cidade?: string,
  estado?: string,
  cep?: string
): Promise<EnderecoGeocodificado | null> {
  try {
    let texto = endereco;
    if (cidade) texto += `, ${cidade}`;
    if (estado) texto += `, ${estado}`;
    if (cep) texto += `, ${cep}`;
    texto += ', Brasil';

    const url = `${BASE_URL}/geocode/search?text=${encodeURIComponent(texto)}&country=br&lang=pt&limit=1&apiKey=${GEOAPIFY_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error('Erro na geocodificação:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (data?.features?.length > 0) {
      const feature = data.features[0];
      return {
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        enderecoFormatado: feature.properties.formatted ?? '',
        confianca: feature.properties.rank?.confidence ?? 0,
      };
    }

    return null;
  } catch (error) {
    console.error('Erro ao geocodificar:', error);
    return null;
  }
}

// Matriz de Distâncias - Calcula distâncias entre múltiplos pontos
export async function calcularMatrizDistancias(
  origens: Coordenadas[],
  destinos: Coordenadas[]
): Promise<ResultadoMatriz[][]> {
  try {
    const url = `${BASE_URL}/routematrix?apiKey=${GEOAPIFY_API_KEY}`;
    
    // Formatar sources e targets
    const sources = origens.map(o => ({ location: [o.lng, o.lat] }));
    const targets = destinos.map(d => ({ location: [d.lng, d.lat] }));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'drive',
        sources,
        targets,
      }),
    });

    if (!response.ok) {
      console.error('Erro na matriz de distâncias:', response.status);
      return criarMatrizFallback(origens, destinos);
    }

    const data = await response.json();
    
    // Converter resultado para formato esperado
    const matriz: ResultadoMatriz[][] = [];
    for (let i = 0; i < origens.length; i++) {
      matriz[i] = [];
      for (let j = 0; j < destinos.length; j++) {
        const idx = i * destinos.length + j;
        matriz[i][j] = {
          distanciaMetros: data.sources_to_targets?.[i]?.[j]?.distance ?? 0,
          tempoSegundos: data.sources_to_targets?.[i]?.[j]?.time ?? 0,
        };
      }
    }

    return matriz;
  } catch (error) {
    console.error('Erro ao calcular matriz:', error);
    return criarMatrizFallback(origens, destinos);
  }
}

// Calcular distância entre dois pontos
export async function calcularDistanciaEntrePontos(
  origem: Coordenadas,
  destino: Coordenadas
): Promise<{ distanciaKm: number; tempoMinutos: number }> {
  try {
    const matriz = await calcularMatrizDistancias([origem], [destino]);
    return {
      distanciaKm: (matriz[0]?.[0]?.distanciaMetros ?? 0) / 1000,
      tempoMinutos: Math.ceil((matriz[0]?.[0]?.tempoSegundos ?? 0) / 60),
    };
  } catch (error) {
    // Fallback: cálculo Haversine
    const distancia = calcularDistanciaHaversine(origem, destino);
    return {
      distanciaKm: distancia,
      tempoMinutos: Math.ceil((distancia / 30) * 60), // 30 km/h média
    };
  }
}

// Otimizar rota - Encontra a melhor ordem de visita
export async function otimizarRota(
  origem: Coordenadas,
  waypoints: { id: string; lat: number; lng: number }[]
): Promise<RotaOtimizada> {
  if (waypoints.length === 0) {
    return { ordem: [], distanciaTotal: 0, tempoTotal: 0 };
  }

  if (waypoints.length === 1) {
    const dist = await calcularDistanciaEntrePontos(origem, { lat: waypoints[0].lat, lng: waypoints[0].lng });
    return {
      ordem: [waypoints[0].id],
      distanciaTotal: dist.distanciaKm,
      tempoTotal: dist.tempoMinutos,
    };
  }

  try {
    // Montar URL com todos os waypoints
    const waypointsStr = waypoints.map(w => `${w.lng},${w.lat}`).join('|');
    const url = `${BASE_URL}/routing?waypoints=${origem.lng},${origem.lat}|${waypointsStr}&mode=drive&apiKey=${GEOAPIFY_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Erro ao otimizar rota:', response.status);
      return otimizarRotaLocal(origem, waypoints);
    }

    const data = await response.json();
    
    if (data?.features?.length > 0) {
      const rota = data.features[0];
      const props = rota.properties;
      
      return {
        ordem: waypoints.map(w => w.id), // Mantém ordem original por enquanto
        distanciaTotal: (props.distance ?? 0) / 1000, // metros para km
        tempoTotal: Math.ceil((props.time ?? 0) / 60), // segundos para minutos
        geometria: rota.geometry,
      };
    }

    return otimizarRotaLocal(origem, waypoints);
  } catch (error) {
    console.error('Erro ao otimizar rota:', error);
    return otimizarRotaLocal(origem, waypoints);
  }
}

// Otimização local usando algoritmo do vizinho mais próximo
async function otimizarRotaLocal(
  origem: Coordenadas,
  waypoints: { id: string; lat: number; lng: number }[]
): Promise<RotaOtimizada> {
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

// Fórmula de Haversine para cálculo de distância
function calcularDistanciaHaversine(p1: Coordenadas, p2: Coordenadas): number {
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

// Criar matriz fallback usando Haversine
function criarMatrizFallback(origens: Coordenadas[], destinos: Coordenadas[]): ResultadoMatriz[][] {
  const matriz: ResultadoMatriz[][] = [];
  for (let i = 0; i < origens.length; i++) {
    matriz[i] = [];
    for (let j = 0; j < destinos.length; j++) {
      const distKm = calcularDistanciaHaversine(origens[i], destinos[j]);
      matriz[i][j] = {
        distanciaMetros: distKm * 1000,
        tempoSegundos: (distKm / 30) * 3600, // 30 km/h média
      };
    }
  }
  return matriz;
}

// Gerar URL de mapa estático com rota
export function gerarUrlMapaRota(
  origem: { latitude: number; longitude: number },
  destinos: { latitude: number; longitude: number }[],
  largura: number = 800,
  altura: number = 500
): string {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY;
  
  if (!apiKey) {
    return '';
  }

  // Marcador de origem (verde)
  const marcadorOrigem = `lonlat:${origem.longitude},${origem.latitude};type:awesome;color:%2322c55e;size:large;icon:home`;
  
  // Marcadores de destino (rosa) com números
  const marcadoresDestinos = destinos.map((dest, idx) => 
    `lonlat:${dest.longitude},${dest.latitude};type:awesome;color:%23ec4899;size:medium;text:${idx + 1}`
  ).join('|');

  // Calcular zoom e centro automaticamente
  const pontos = [origem, ...destinos];
  const allLats = pontos.map(p => p.latitude);
  const allLngs = pontos.map(p => p.longitude);
  const centerLat = (Math.min(...allLats) + Math.max(...allLats)) / 2;
  const centerLng = (Math.min(...allLngs) + Math.max(...allLngs)) / 2;
  
  // Calcular zoom baseado na extensão
  const latDiff = Math.max(...allLats) - Math.min(...allLats);
  const lngDiff = Math.max(...allLngs) - Math.min(...allLngs);
  const maxDiff = Math.max(latDiff, lngDiff);
  
  let zoom = 14;
  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;

  // Construir URL manualmente
  const params = new URLSearchParams({
    style: 'osm-bright',
    width: largura.toString(),
    height: altura.toString(),
    center: `lonlat:${centerLng},${centerLat}`,
    zoom: zoom.toString(),
    apiKey: apiKey,
  });

  const markers = marcadoresDestinos ? `${marcadorOrigem}|${marcadoresDestinos}` : marcadorOrigem;
  const baseUrl = 'https://lh3.googleusercontent.com/Pbx5X4UQyTi4rjIH5OA-07eD46ZTSXrc9QbwwDdvr1j9NxDr-kndSLO9tNdyRfTunj0xuSa-OC-G1v9ikQX-7GHz8OCJiTXF2KA=e365-pa-nu-s0';
  
  return `${baseUrl}?${params.toString()}&marker=${encodeURIComponent(markers)}`;
}

export const geoapifyClient = {
  geocodificarEndereco,
  calcularMatrizDistancias,
  calcularDistanciaEntrePontos,
  otimizarRota,
  gerarUrlMapaRota,
};