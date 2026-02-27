import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Extrair host do banco de dados (sem credenciais)
  let databaseHost = 'local';
  try {
    const match = databaseUrl.match(/@([^:]+)/);
    if (match) {
      databaseHost = match[1];
    } else if (databaseUrl.includes('localhost')) {
      databaseHost = 'localhost';
    }
  } catch {
    databaseHost = 'desconhecido';
  }

  // Truncar para exibição
  if (databaseHost.length > 25) {
    databaseHost = databaseHost.substring(0, 22) + '...';
  }

  return NextResponse.json({
    environment: nodeEnv,
    databaseHost,
    lalamoveEnv: process.env.LALAMOVE_ENV || 'sandbox',
    logLevel: process.env.LOG_LEVEL || 'debug',
  });
}
