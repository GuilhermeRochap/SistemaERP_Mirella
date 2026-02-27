#!/bin/bash

# ============================================
# Script de Deploy para VPS
# Mirella Doces Delivery System
# ============================================

set -e

echo "🚀 Iniciando deploy do Mirella Doces..."
echo "========================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado. Instalando...${NC}"
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✅ Docker instalado!${NC}"
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado. Instalando...${NC}"
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✅ Docker Compose instalado!${NC}"
fi

# Verificar arquivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo "Criando .env a partir do template..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  EDITE O ARQUIVO .env COM SUAS CONFIGURAÇÕES!${NC}"
    echo "Execute: nano .env"
    exit 1
fi

# Pull das últimas alterações
echo -e "${YELLOW}📥 Atualizando código...${NC}"
git pull origin main

# Build e inicialização
echo -e "${YELLOW}🔨 Construindo containers...${NC}"
docker-compose down
docker-compose build --no-cache

echo -e "${YELLOW}🗄️  Executando migrations...${NC}"
docker-compose run --rm app npx prisma migrate deploy

echo -e "${YELLOW}🚀 Iniciando aplicação...${NC}"
docker-compose up -d

# Verificar status
echo ""
echo "========================================"
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo "========================================"
echo ""
docker-compose ps
echo ""
echo -e "📍 Aplicação disponível em: ${GREEN}http://$(hostname -I | awk '{print $1}'):3000${NC}"
echo -e "🔍 Logs: ${YELLOW}docker-compose logs -f app${NC}"
echo ""
