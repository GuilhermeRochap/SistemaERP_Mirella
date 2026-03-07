// Cliente Lalamove API v3 para cotação e solicitação de veículos
import crypto from 'crypto';

const API_KEY = process.env.LALAMOVE_API_KEY ?? '';
const API_SECRET = process.env.LALAMOVE_API_SECRET ?? '';
const BASE_URL = API_KEY.startsWith('pk_test_')
  ? 'https://rest.sandbox.lalamove.com'
  : 'https://rest.lalamove.com';
const MARKET = 'BR'; // Brasil

// Tipos de veículo Lalamove Brasil
// Válidos: CAR, HATCHBACK, LALAGO, LALAGOFOUR, LALAPRO, TRUCK330, TRUCK_6H, UV_4H, UV_FIORINO, VAN, VANFOURH
export type LalamoveServiceType = 'LALAGO' | 'CAR' | 'VAN' | 'TRUCK330' | 'UV_FIORINO' | 'HATCHBACK';

export interface LalamoveStop {
  coordinates: {
    lat: string;
    lng: string;
  };
  address: string;
}

export interface LalamoveQuotationRequest {
  serviceType: LalamoveServiceType;
  stops: LalamoveStop[];
  scheduleAt?: string; // ISO 8601 format
  isRouteOptimized?: boolean;
  specialRequests?: string[];
}

export interface LalamovePriceBreakdown {
  base: string;
  extraMileage: string;
  surcharge: string;
  totalBeforeOptimization: string;
  total: string;
  currency: string;
}

export interface LalamoveQuotationResponse {
  quotationId: string;
  serviceType: LalamoveServiceType;
  expiresAt: string;
  priceBreakdown: LalamovePriceBreakdown;
  distance?: {
    value: string;
    unit: string;
  };
  stops?: Array<{
    stopId: string;
    coordinates: { lat: string; lng: string };
    address: string;
  }>;
}

export interface LalamoveOrderRequest {
  quotationId: string;
  sender: {
    stopId: string;
    name: string;
    phone: string;
  };
  recipients: Array<{
    stopId: string;
    name: string;
    phone: string;
    remarks?: string;
  }>;
  specialRequests?: string[];
  metadata?: Record<string, any>;
}

export interface LalamoveOrderResponse {
  orderId: string;
  quotationId: string;
  status: string;
  price: LalamovePriceBreakdown;
}

// Gerar assinatura HMAC-SHA256
function generateSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string
): string {
  const rawSignature = `${timestamp}\r\n${method}\r\n${path}\r\n\r\n${body}`;
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(rawSignature)
    .digest('hex');
  return signature;
}

// Gerar headers de autenticação
function getAuthHeaders(method: string, path: string, body: string = ''): Record<string, string> {
  const timestamp = Date.now().toString();
  const signature = generateSignature(timestamp, method, path, body);

  return {
    'Content-Type': 'application/json',
    'Authorization': `hmac ${API_KEY}:${timestamp}:${signature}`,
    'Market': MARKET,
    'Request-ID': `req_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  };
}

// Mapear tipo de veículo interno para Lalamove Brasil
export function mapVehicleToLalamove(tipoVeiculo: string, pesoTotal: number): LalamoveServiceType {
  // Baseado no peso e tipo selecionado
  // LALAGO = moto/pequenas entregas, CAR = carro, VAN = van, TRUCK330 = caminhão
  if (tipoVeiculo === 'Moto' || pesoTotal <= 20) {
    return 'LALAGO'; // Serviço de moto no Brasil
  } else if (tipoVeiculo === 'Carro' || pesoTotal <= 100) {
    return 'CAR';
  } else if (tipoVeiculo === 'Van' || pesoTotal <= 300) {
    return 'VAN';
  } else {
    return 'TRUCK330';
  }
}

// Obter cotação de entrega
export async function getQuotation(
  serviceType: LalamoveServiceType,
  stops: LalamoveStop[],
  scheduleAt?: string,
  isRouteOptimized: boolean = false
): Promise<LalamoveQuotationResponse | null> {
  try {
    const path = '/v3/quotations';
    const body = JSON.stringify({
      data: {
        serviceType,
        stops,
        language: 'pt_BR',
        ...(scheduleAt && { scheduleAt }),
        ...(stops.length > 2 && { isRouteOptimized }),
      },
    });

    const headers = getAuthHeaders('POST', path, body);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Erro na cotação Lalamove:', response.status, errorData);
      return null;
    }

    const data = await response.json();
    return data.data as LalamoveQuotationResponse;
  } catch (error) {
    console.error('Erro ao obter cotação Lalamove:', error);
    return null;
  }
}

// Obter cotações para todos os tipos de veículo (Brasil)
export async function getAllQuotations(
  stops: LalamoveStop[],
  scheduleAt?: string
): Promise<Array<{ serviceType: LalamoveServiceType; quotation: LalamoveQuotationResponse | null }>> {
  // Tipos disponíveis no Brasil: LALAGO (moto), CAR, VAN
  const serviceTypes: LalamoveServiceType[] = ['LALAGO', 'CAR', 'VAN'];

  const quotations = await Promise.all(
    serviceTypes.map(async (serviceType) => {
      const quotation = await getQuotation(serviceType, stops, scheduleAt);
      return { serviceType, quotation };
    })
  );

  return quotations;
}

// Criar pedido de entrega
export async function createOrder(
  orderData: LalamoveOrderRequest
): Promise<{ success: true; data: LalamoveOrderResponse } | { success: false; error: string }> {
  try {
    const path = '/v3/orders';
    const body = JSON.stringify({ data: orderData });

    console.log('Criando pedido Lalamove:', body);

    const headers = getAuthHeaders('POST', path, body);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body,
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Erro ao criar pedido Lalamove:', response.status, responseData);
      const errorMessage = responseData?.errors?.[0]?.detail ||
        responseData?.message ||
        `Erro ${response.status} ao criar pedido`;
      return { success: false, error: errorMessage };
    }

    console.log('Pedido Lalamove criado com sucesso:', responseData);
    return { success: true, data: responseData.data as LalamoveOrderResponse };
  } catch (error: any) {
    console.error('Erro ao criar pedido Lalamove:', error);
    return { success: false, error: error.message || 'Erro de conexão com Lalamove' };
  }
}

// Obter status do pedido
export async function getOrderStatus(orderId: string): Promise<any | null> {
  try {
    const path = `/v3/orders/${orderId}`;
    const headers = getAuthHeaders('GET', path);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      console.error('Erro ao obter status do pedido:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Erro ao obter status do pedido:', error);
    return null;
  }
}

// Cancelar pedido
export async function cancelOrder(orderId: string): Promise<boolean> {
  try {
    const path = `/v3/orders/${orderId}`;
    const headers = getAuthHeaders('DELETE', path);

    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });

    return response.ok;
  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    return false;
  }
}

// Formatar preço para exibição
export function formatPrice(price: string, currency: string = 'BRL'): string {
  const numPrice = parseFloat(price);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(numPrice);
}

// Mapear tipo Lalamove para nome em português
export function getVehicleName(serviceType: string): string {
  const names: Record<string, string> = {
    LALAGO: 'Moto',
    CAR: 'Carro',
    HATCHBACK: 'Hatchback',
    VAN: 'Van',
    TRUCK330: 'Caminhão 330kg',
    UV_FIORINO: 'Fiorino',
  };
  return names[serviceType] ?? serviceType;
}

// Exportar cliente
export const lalamoveClient = {
  getQuotation,
  getAllQuotations,
  createOrder,
  getOrderStatus,
  cancelOrder,
  mapVehicleToLalamove,
  formatPrice,
  getVehicleName,
};
