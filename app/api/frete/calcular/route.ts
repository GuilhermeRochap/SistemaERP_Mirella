import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lalamoveClient } from '@/lib/lalamove-client';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request?.json?.();
    const { cep, endereco, bairro, cidade, estado } = body;

    // Buscar configuração de origem
    const config = await db?.configuracao?.findUnique?.({
      where: { id: 'config_principal' },
    });

    if (!config?.latitude || !config?.longitude) {
      return NextResponse.json(
        { error: 'Configure o endereço de origem nas configurações' },
        { status: 400 }
      );
    }

    let destinoLat: number | null = null;
    let destinoLng: number | null = null;
    let enderecoDestino = '';

    const apiKey = process.env.GEOAPIFY_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

    // Montar endereço para geocodificação
    // Prioridade: endereço completo > bairro+cidade > CEP
    if (endereco && cidade) {
      // Usar endereço completo fornecido
      const partes = [endereco, bairro, cidade, estado, 'Brasil'].filter(Boolean);
      enderecoDestino = partes.join(', ');
    } else if (bairro && cidade) {
      enderecoDestino = `${bairro}, ${cidade}, ${estado || 'SP'}, Brasil`;
    } else if (cep) {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) {
        return NextResponse.json(
          { error: 'CEP inválido. O CEP deve ter 8 dígitos.' },
          { status: 400 }
        );
      }
      enderecoDestino = `CEP ${cepLimpo}, Brasil`;
    } else {
      return NextResponse.json(
        { error: 'Informe o endereço de entrega (CEP, bairro e cidade)' },
        { status: 400 }
      );
    }

    console.log(`Geocodificando endereço: ${enderecoDestino}`);

    try {
      // Geocodificar via Geoapify
      const geoResponse = await fetch(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(enderecoDestino)}&filter=countrycode:br&limit=1&apiKey=${apiKey}`
      );
      const geoData = await geoResponse.json();
      
      console.log('Geoapify response:', JSON.stringify(geoData?.features?.[0]?.geometry));
      
      if (geoData?.features?.[0]?.geometry?.coordinates) {
        destinoLng = geoData.features[0].geometry.coordinates[0];
        destinoLat = geoData.features[0].geometry.coordinates[1];
      } else if (cidade) {
        // Fallback: tentar apenas com cidade e estado
        console.log('Tentando fallback com cidade/estado');
        const fallbackEndereco = `${cidade}, ${estado || 'SP'}, Brasil`;
        const fallbackResponse = await fetch(
          `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(fallbackEndereco)}&filter=countrycode:br&limit=1&apiKey=${apiKey}`
        );
        const fallbackData = await fallbackResponse.json();
        
        if (fallbackData?.features?.[0]?.geometry?.coordinates) {
          destinoLng = fallbackData.features[0].geometry.coordinates[0];
          destinoLat = fallbackData.features[0].geometry.coordinates[1];
          console.log('Fallback funcionou:', destinoLat, destinoLng);
        }
      }
    } catch (error) {
      console.error('Erro ao geocodificar endereço:', error);
      return NextResponse.json(
        { error: 'Erro de conexão. Tente novamente ou digite o valor manualmente.' },
        { status: 500 }
      );
    }

    if (!destinoLat || !destinoLng) {
      return NextResponse.json(
        { error: 'Não foi possível localizar este endereço. Verifique os dados ou digite o frete manualmente.' },
        { status: 400 }
      );
    }

    // Obter cotações da Lalamove para os 3 tipos de veículos
    const stops = [
      {
        coordinates: { lat: config.latitude.toString(), lng: config.longitude.toString() },
        address: `${config.endereco}, ${config.numero || ''}, ${config.cidade}, ${config.estado}`,
      },
      {
        coordinates: { lat: destinoLat.toString(), lng: destinoLng.toString() },
        address: enderecoDestino,
      },
    ];

    const cotacoes: Array<{
      tipo: string;
      nome: string;
      valor: number;
      distancia?: number;
      fonte: string;
    }> = [];

    // Tentar obter cotações da Lalamove para Moto, Carro e Van
    const tiposVeiculo: Array<{ service: 'LALAGO' | 'CAR' | 'VAN'; nome: string }> = [
      { service: 'LALAGO', nome: 'Moto' },
      { service: 'CAR', nome: 'Carro' },
      { service: 'VAN', nome: 'Van' },
    ];

    let distanciaBase: number | undefined;

    for (const veiculo of tiposVeiculo) {
      try {
        const quotation = await lalamoveClient.getQuotation(veiculo.service, stops);
        
        if (quotation?.priceBreakdown?.total) {
          const valor = parseFloat(quotation.priceBreakdown.total);
          // Extrair distância do objeto (Lalamove retorna { value: string, unit: string })
          let distanciaKm: number | undefined;
          if (quotation.distance) {
            const distObj = quotation.distance as { value?: string; unit?: string } | number;
            if (typeof distObj === 'object' && distObj.value) {
              distanciaKm = parseFloat(distObj.value);
            } else if (typeof distObj === 'number') {
              distanciaKm = distObj;
            }
          }
          if (!distanciaBase && distanciaKm) {
            distanciaBase = distanciaKm;
          }
          cotacoes.push({
            tipo: veiculo.service,
            nome: veiculo.nome,
            valor,
            distancia: distanciaKm,
            fonte: 'Lalamove',
          });
        }
      } catch (error) {
        console.error(`Erro ao obter cotação Lalamove (${veiculo.nome}):`, error);
      }
    }

    // Se obteve pelo menos uma cotação da Lalamove
    if (cotacoes.length > 0) {
      return NextResponse.json({
        cotacoes,
        distancia: distanciaBase,
        fonte: 'Lalamove',
      });
    }

    // Fallback: cálculo estimado baseado em distância
    const R = 6371;
    const dLat = (destinoLat - config.latitude) * Math.PI / 180;
    const dLon = (destinoLng - config.longitude) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(config.latitude * Math.PI / 180) * Math.cos(destinoLat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanciaKm = R * c;

    // Estimativas baseadas na distância
    const cotacoesEstimadas = [
      { tipo: 'LALAGO', nome: 'Moto', valor: Math.round((5 + distanciaKm * 1.5) * 100) / 100, fonte: 'Estimativa' },
      { tipo: 'CAR', nome: 'Carro', valor: Math.round((8 + distanciaKm * 2) * 100) / 100, fonte: 'Estimativa' },
      { tipo: 'VAN', nome: 'Van', valor: Math.round((12 + distanciaKm * 2.5) * 100) / 100, fonte: 'Estimativa' },
    ];

    return NextResponse.json({
      cotacoes: cotacoesEstimadas,
      distancia: Math.round(distanciaKm * 10) / 10,
      fonte: 'Estimativa',
    });
  } catch (error) {
    console.error('Erro ao calcular frete:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular frete' },
      { status: 500 }
    );
  }
}
