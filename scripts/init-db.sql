-- ============================================
-- Script de Inicialização do Banco de Dados
-- Executado automaticamente pelo Docker
-- ============================================

-- Criar extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Log de inicialização
DO $$
BEGIN
    RAISE NOTICE 'Banco de dados inicializado com sucesso!';
    RAISE NOTICE 'Timestamp: %', NOW();
END $$;
