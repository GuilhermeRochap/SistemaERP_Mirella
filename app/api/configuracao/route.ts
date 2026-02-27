import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodificarEndereco } from '@/lib/geoapify-client';

export const dynamic = 'force-dynamic';

const CONFIG_ID = 'config_principal';

// Buscar configuração
export async function GET() {
  try {
    let config = await db?.configuracao?.findUnique?.({
      where: { id: CONFIG_ID },
    });

    // Se não existir, criar configuração padrão
    if (!config) {
      config = await db?.configuracao?.create?.({
        data: {
          id: CONFIG_ID,
          nomeEmpresa: 'Mirella Doces',
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar configuração' },
      { status: 500 }
    );
  }
}

// Atualizar configuração
export async function PUT(request: Request) {
  try {
    const data = await request?.json?.();

    // Sempre geocodificar quando tiver endereço e cidade
    // Não usar coordenadas do frontend pois podem estar desatualizadas
    let latitude: number | null = null;
    let longitude: number | null = null;

    if (data?.endereco && data?.cidade) {
      const enderecoCompleto = `${data?.endereco ?? ''}, ${data?.numero ?? ''} - ${data?.bairro ?? ''}, ${data?.cidade ?? ''} - ${data?.estado ?? ''}, ${data?.cep ?? ''}, Brasil`;
      
      console.log('Geocodificando endereço:', enderecoCompleto);
      
      try {
        const resultado = await geocodificarEndereco(enderecoCompleto);
        if (resultado) {
          latitude = resultado.latitude;
          longitude = resultado.longitude;
          console.log('Coordenadas obtidas:', latitude, longitude);
        } else {
          console.log('Geocodificação não retornou resultado');
        }
      } catch (geoError) {
        console.error('Erro ao geocodificar endereço:', geoError);
        // Continua mesmo sem coordenadas
      }
    }

    const config = await db?.configuracao?.upsert?.({
      where: { id: CONFIG_ID },
      update: {
        nomeEmpresa: data?.nomeEmpresa,
        cep: data?.cep,
        endereco: data?.endereco,
        numero: data?.numero,
        complemento: data?.complemento,
        bairro: data?.bairro,
        cidade: data?.cidade,
        estado: data?.estado,
        latitude,
        longitude,
        telefone: data?.telefone,
      },
      create: {
        id: CONFIG_ID,
        nomeEmpresa: data?.nomeEmpresa ?? 'Mirella Doces',
        cep: data?.cep,
        endereco: data?.endereco,
        numero: data?.numero,
        complemento: data?.complemento,
        bairro: data?.bairro,
        cidade: data?.cidade,
        estado: data?.estado,
        latitude,
        longitude,
        telefone: data?.telefone,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar configuração' },
      { status: 500 }
    );
  }
}
