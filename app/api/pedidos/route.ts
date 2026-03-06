import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { geoapifyClient } from '@/lib/geoapify-client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request?.url ?? '');
    const status = searchParams?.get?.('status');
    const data = searchParams?.get?.('data');
    const busca = searchParams?.get?.('busca');

    const where: any = {};

    if (status) {
      where.statusProducao = status;
    }

    if (data) {
      const dataInicio = new Date(data);
      const dataFim = new Date(data);
      dataFim.setDate(dataFim?.getDate?.() + 1);
      where.dataEntrega = {
        gte: dataInicio,
        lt: dataFim,
      };
    }

    if (busca) {
      where.OR = [
        { nomeRecebedor: { contains: busca, mode: 'insensitive' } },
        { cpf: { contains: busca } },
        { telefone: { contains: busca } },
      ];
    }

    const pedidos = await db?.pedido?.findMany?.({
      where,
      include: {
        rota: true,
        historico: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: [
        { status: 'asc' },
        { dataEntrega: 'asc' },
        { horaEntrega: 'asc' },
      ],
    }) ?? [];

    return NextResponse.json(pedidos);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar pedidos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request?.json?.();

    // Validar campos obrigatórios (CPF e telefone são opcionais)
    const camposObrigatorios = [
      'nomeRecebedor',
      'cep',
      'endereco',
      'bairro',
      'cidade',
      'estado',
      'dataEntrega',
      'horaEntrega',
      'tempoEstimadoProducao',
      'status',
      'descricao',
      'peso',
      'altura',
      'largura',
      'profundidade',
    ];

    for (const campo of camposObrigatorios) {
      if (!body?.[campo]) {
        return NextResponse.json(
          { error: `Campo ${campo} é obrigatório` },
          { status: 400 }
        );
      }
    }

    // Geocodificar endereço automaticamente se não houver coordenadas
    let latitude = body?.latitude ? parseFloat(body?.latitude) : null;
    let longitude = body?.longitude ? parseFloat(body?.longitude) : null;

    if (!latitude || !longitude) {
      try {
        const enderecoCompleto = `${body?.endereco}, ${body?.numero ?? ''}`;
        const resultado = await geoapifyClient.geocodificarEndereco(
          enderecoCompleto,
          body?.cidade,
          body?.estado,
          body?.cep
        );
        if (resultado) {
          latitude = resultado.latitude;
          longitude = resultado.longitude;
        }
      } catch (error) {
        console.error('Erro ao geocodificar endereço:', error);
        // Continua sem coordenadas
      }
    }

    // Criar pedido
    const pedido = await db?.pedido?.create?.({
      data: {
        nomeRecebedor: body?.nomeRecebedor,
        telefone: body?.telefone,
        cpf: body?.cpf,
        cep: body?.cep,
        endereco: body?.endereco,
        numero: body?.numero,
        complemento: body?.complemento,
        bairro: body?.bairro,
        cidade: body?.cidade,
        estado: body?.estado,
        latitude,
        longitude,
        dataEntrega: new Date(`${body?.dataEntrega}T12:00:00`),
        horaEntrega: body?.horaEntrega,
        tempoEstimadoProducao: parseInt(body?.tempoEstimadoProducao),
        status: body?.status,
        descricao: body?.descricao,
        peso: parseFloat(body?.peso),
        altura: parseFloat(body?.altura),
        largura: parseFloat(body?.largura),
        profundidade: parseFloat(body?.profundidade),
        // Novos campos
        valorTotalCompra: body?.valorTotalCompra ? parseFloat(body?.valorTotalCompra) : null,
        valorFretePago: body?.valorFretePago ? parseFloat(body?.valorFretePago) : null,
        valorFreteReal: body?.valorFreteReal ? parseFloat(body?.valorFreteReal) : null,
        origemPedido: body?.origemPedido || null,
        formaPagamento: body?.formaPagamento || null,
        pedidoAnonimo: body?.pedidoAnonimo || false,
        mensagemAnonima: body?.mensagemAnonima || null,
        nomeComprador: body?.nomeComprador || null,
        telefoneComprador: body?.telefoneComprador || null,
      },
    });

    // Criar histórico
    await db?.historicoStatus?.create?.({
      data: {
        pedidoId: pedido?.id ?? '',
        statusNovo: 'Aguardando Produção',
      },
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    return NextResponse.json(
      { error: 'Erro ao criar pedido' },
      { status: 500 }
    );
  }
}
