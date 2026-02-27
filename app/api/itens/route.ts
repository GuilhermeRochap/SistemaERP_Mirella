import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Listar todos os itens
export async function GET() {
  try {
    const itens = await db?.item?.findMany?.({
      orderBy: { nome: 'asc' },
    });

    return NextResponse.json(itens ?? []);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar itens' },
      { status: 500 }
    );
  }
}

// POST - Criar novo item
export async function POST(request: Request) {
  try {
    const body = await request?.json?.();
    const { nome, descricao, altura, largura, comprimento, peso } = body;

    if (!nome?.trim?.()) {
      return NextResponse.json(
        { error: 'Nome do item é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já existe item com mesmo nome
    const existente = await db?.item?.findFirst?.({
      where: { nome: { equals: nome.trim(), mode: 'insensitive' } },
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Já existe um item com esse nome' },
        { status: 400 }
      );
    }

    const novoItem = await db?.item?.create?.({
      data: {
        nome: nome.trim(),
        descricao: descricao?.trim?.() || null,
        altura: parseFloat(altura) || 37,
        largura: parseFloat(largura) || 27,
        comprimento: parseFloat(comprimento) || 27,
        peso: parseFloat(peso) || 1,
      },
    });

    return NextResponse.json(novoItem);
  } catch (error) {
    console.error('Erro ao criar item:', error);
    return NextResponse.json(
      { error: 'Erro ao criar item' },
      { status: 500 }
    );
  }
}
