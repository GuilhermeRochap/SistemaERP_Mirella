// Cliente para integração com Open Delivery API

interface OpenDeliveryConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface DistanceMatrixRequest {
  origins: Array<{ lat: number; lng: number }>;
  destinations: Array<{ lat: number; lng: number }>;
}

interface DistanceMatrixResponse {
  rows: Array<{
    elements: Array<{
      distance: { value: number; text: string };
      duration: { value: number; text: string };
      status: string;
    }>;
  }>;
}

interface RouteRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
}

interface RouteResponse {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: any;
    legs: Array<{
      distance: number;
      duration: number;
    }>;
  }>;
}

class OpenDeliveryClient {
  private config: OpenDeliveryConfig;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(config: OpenDeliveryConfig) {
    this.config = config;
  }

  private async getAccessToken(): Promise<string> {
    const now = Date?.now?.() ?? 0;
    
    if (this?.accessToken && now < this?.tokenExpiry) {
      return this?.accessToken ?? '';
    }

    try {
      const response = await fetch(`${this?.config?.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: this?.config?.clientId,
          client_secret: this?.config?.clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!response?.ok) {
        throw new Error(`Falha na autenticação: ${response?.status}`);
      }

      const data: AccessTokenResponse = await response?.json?.();
      this.accessToken = data?.access_token ?? null;
      this.tokenExpiry = (now + ((data?.expires_in ?? 0) * 1000)) - 60000; // 1 min de margem
      
      return this?.accessToken ?? '';
    } catch (error) {
      console.error('Erro ao obter token:', error);
      throw error;
    }
  }

  async calculateDistanceMatrix(
    origins: Array<{ lat: number; lng: number }>,
    destinations: Array<{ lat: number; lng: number }>
  ): Promise<number[][]> {
    try {
      // Por ora, vamos usar cálculo de distância euclidiana como fallback
      // Em produção, isso seria substituído pela chamada real à API
      const matrix: number[][] = [];
      
      for (const origin of origins ?? []) {
        const row: number[] = [];
        for (const dest of destinations ?? []) {
          const distance = this?.calculateHaversineDistance?.(origin, dest) ?? 0;
          row.push(distance);
        }
        matrix.push(row);
      }
      
      return matrix;
    } catch (error) {
      console.error('Erro ao calcular matriz de distâncias:', error);
      return [];
    }
  }

  private calculateHaversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this?.toRad?.((point2?.lat ?? 0) - (point1?.lat ?? 0)) ?? 0;
    const dLon = this?.toRad?.((point2?.lng ?? 0) - (point1?.lng ?? 0)) ?? 0;
    const lat1 = this?.toRad?.(point1?.lat ?? 0) ?? 0;
    const lat2 = this?.toRad?.(point2?.lat ?? 0) ?? 0;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async optimizeRoute(
    waypoints: Array<{ lat: number; lng: number; id: string }>
  ): Promise<{ order: string[]; totalDistance: number; totalDuration: number }> {
    try {
      // Algoritmo simples de vizinho mais próximo
      if (!waypoints || waypoints?.length === 0) {
        return { order: [], totalDistance: 0, totalDuration: 0 };
      }

      const visited = new Set<number>();
      const order: string[] = [];
      let totalDistance = 0;
      let currentIndex = 0;

      visited.add(0);
      order.push(waypoints?.[0]?.id ?? '');

      while (visited?.size < (waypoints?.length ?? 0)) {
        let nearestIndex = -1;
        let minDistance = Infinity;

        for (let i = 0; i < (waypoints?.length ?? 0); i++) {
          if (!visited?.has?.(i)) {
            const distance = this?.calculateHaversineDistance?.(
              waypoints?.[currentIndex] ?? { lat: 0, lng: 0 },
              waypoints?.[i] ?? { lat: 0, lng: 0 }
            ) ?? Infinity;

            if (distance < minDistance) {
              minDistance = distance;
              nearestIndex = i;
            }
          }
        }

        if (nearestIndex !== -1) {
          visited.add(nearestIndex);
          order.push(waypoints?.[nearestIndex]?.id ?? '');
          totalDistance += minDistance;
          currentIndex = nearestIndex;
        }
      }

      // Estimativa de tempo: 30 km/h médio + 5 min por parada
      const totalDuration = (totalDistance / 30) * 60 + ((waypoints?.length ?? 0) * 5);

      return {
        order,
        totalDistance,
        totalDuration: Math.round(totalDuration),
      };
    } catch (error) {
      console.error('Erro ao otimizar rota:', error);
      return { order: [], totalDistance: 0, totalDuration: 0 };
    }
  }
}

export const openDeliveryClient = new OpenDeliveryClient({
  clientId: process.env.OPEN_DELIVERY_CLIENT_ID ?? '',
  clientSecret: process.env.OPEN_DELIVERY_CLIENT_SECRET ?? '',
  baseUrl: process.env.OPEN_DELIVERY_BASE_URL ?? '',
});
