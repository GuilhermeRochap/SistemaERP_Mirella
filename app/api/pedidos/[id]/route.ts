import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geocodificarEndereco } from '@/lib/geoapify-client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const pedido = await db.pedido.findUnique({
      where: { id: params.id },
      include: {
        rota: true,
        historico: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(pedido);
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedido' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { 
      cep, 
      endereco, 
      numero, 
      complemento, 
      bairro, 
      cidade, 
      estado,
      regeocoding,
      ...otherFields 
    } = body;

    // Preparar dados para atualização
    const updateData: any = {
      ...otherFields,
    };

    // Se campos de endereço foram enviados, atualizar
    if (cep !== undefined) updateData.cep = cep;
    if (endereco !== undefined) updateData.endereco = endereco;
    if (numero !== undefined) updateData.numero = numero;
    if (complemento !== undefined) updateData.complemento = complemento;
    if (bairro !== undefined) updateData.bairro = bairro;
    if (cidade !== undefined) updateData.cidade = cidade;
    if (estado !== undefined) updateData.estado = estado;

    // Se regeocoding for true, buscar novas coordenadas
    if (regeocoding && endereco && cidade) {
      console.log('[PUT Pedido] Re-geocodificando endereço:', { endereco, numero, bairro, cidade, estado });
      
      const enderecoCompleto = `${endereco}, ${numero || ''}, ${bairro || ''}, ${cidade}, ${estado || 'SP'}, Brasil`;
      const resultado = await geocodificarEndereco(enderecoCompleto);
      
      if (resultado) {
        updateData.latitude = resultado.latitude;
        updateData.longitude = resultado.longitude;
        console.log('[PUT Pedido] Novas coordenadas:', resultado.latitude, resultado.longitude);
      } else {
        console.log('[PUT Pedido] Falha na geocodificação, mantendo coordenadas anteriores');
      }
    }

    const pedidoAtualizado = await db.pedido.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(pedidoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar pedido' },
      { status: 500 }
    );
  }
}
