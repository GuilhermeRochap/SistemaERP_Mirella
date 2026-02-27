/**
 * Configuração Centralizada do Sistema
 * Alterna automaticamente entre desenvolvimento e produção
 */

export const config = {
  // Ambiente atual
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Servidor
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Banco de Dados
  database: {
    url: process.env.DATABASE_URL || '',
    // Pool de conexões diferente para cada ambiente
    poolSize: process.env.NODE_ENV === 'production' ? 20 : 5,
    // Timeout
    connectionTimeout: process.env.NODE_ENV === 'production' ? 30000 : 10000,
  },

  // APIs Externas
  openDelivery: {
    clientId: process.env.OPEN_DELIVERY_CLIENT_ID || '',
    clientSecret: process.env.OPEN_DELIVERY_CLIENT_SECRET || '',
    baseUrl: process.env.OPEN_DELIVERY_BASE_URL || '',
  },

  geoapify: {
    apiKey: process.env.GEOAPIFY_API_KEY || '',
    publicApiKey: process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '',
  },

  lalamove: {
    apiKey: process.env.LALAMOVE_API_KEY || '',
    apiSecret: process.env.LALAMOVE_API_SECRET || '',
    env: process.env.LALAMOVE_ENV || 'sandbox',
    baseUrl: process.env.LALAMOVE_ENV === 'production'
      ? 'https://rest.lalamove.com'
      : 'https://rest.sandbox.lalamove.com',
  },

  // Logs
  logging: {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
  },
};

// Validação de configuração crítica
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.database.url) {
    errors.push('DATABASE_URL não configurada');
  }

  if (!config.geoapify.apiKey) {
    errors.push('GEOAPIFY_API_KEY não configurada');
  }

  if (config.isProduction) {
    if (!config.lalamove.apiKey.startsWith('pk_live')) {
      errors.push('AVISO: Usando chave de teste Lalamove em produção!');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Exibe configuração no console (sem secrets)
export function logConfig(): void {
  console.log('\n========================================');
  console.log(`🚀 AMBIENTE: ${config.env.toUpperCase()}`);
  console.log('========================================');
  console.log(`📍 URL Base: ${config.baseUrl}`);
  console.log(`🔌 Porta: ${config.port}`);
  console.log(`🗄️  Banco: ${config.database.url.split('@')[1]?.split('/')[0] || 'local'}`);
  console.log(`📝 Log Level: ${config.logging.level}`);
  console.log(`🚚 Lalamove: ${config.lalamove.env}`);
  console.log('========================================\n');
}

export default config;
