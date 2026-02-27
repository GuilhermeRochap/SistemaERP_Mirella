#!/bin/bash

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║       🍰 MIRELLA DOCES - Sistema de Rotas                     ║"
echo "║           Assistente de Configuração                          ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar se Docker está instalado
echo -e "${BLUE}[1/6] Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não encontrado!${NC}"
    echo "Instale o Docker primeiro: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não encontrado!${NC}"
    echo "Instale o Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo -e "${GREEN}✓ Docker instalado${NC}"

# Verificar se .env já existe
if [ -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env já existe!${NC}"
    read -p "Deseja sobrescrever? (s/N): " overwrite
    if [[ ! "$overwrite" =~ ^[Ss]$ ]]; then
        echo -e "${BLUE}Mantendo .env existente...${NC}"
        skip_env=true
    fi
fi

if [ "$skip_env" != "true" ]; then
    echo ""
    echo -e "${BLUE}[2/6] Configurando variáveis de ambiente...${NC}"
    echo ""
    
    # Escolher ambiente
    echo -e "${CYAN}Qual ambiente deseja configurar?${NC}"
    echo "  1) Desenvolvimento (sandbox/testes)"
    echo "  2) Produção (dados reais)"
    read -p "Escolha [1/2]: " env_choice
    
    if [ "$env_choice" == "2" ]; then
        NODE_ENV="production"
        LALAMOVE_ENV="production"
        LOG_LEVEL="warn"
        echo -e "${RED}⚠️  ATENÇÃO: Você está configurando PRODUÇÃO!${NC}"
    else
        NODE_ENV="development"
        LALAMOVE_ENV="sandbox"
        LOG_LEVEL="debug"
        echo -e "${GREEN}Configurando ambiente de desenvolvimento...${NC}"
    fi
    
    echo ""
    echo -e "${CYAN}═══ Banco de Dados PostgreSQL ═══${NC}"
    read -p "Usuário do banco [mirella]: " DB_USER
    DB_USER=${DB_USER:-mirella}
    
    read -sp "Senha do banco: " DB_PASS
    echo ""
    if [ -z "$DB_PASS" ]; then
        DB_PASS=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9')
        echo -e "${YELLOW}Senha gerada automaticamente: $DB_PASS${NC}"
    fi
    
    read -p "Nome do banco [mirella_doces]: " DB_NAME
    DB_NAME=${DB_NAME:-mirella_doces}
    
    echo ""
    echo -e "${CYAN}═══ APIs Externas ═══${NC}"
    
    read -p "Chave Geoapify (para mapas): " GEOAPIFY_KEY
    if [ -z "$GEOAPIFY_KEY" ]; then
        echo -e "${YELLOW}⚠️  Sem chave Geoapify - geocodificação não funcionará${NC}"
        GEOAPIFY_KEY="SUA_CHAVE_GEOAPIFY"
    fi
    
    echo ""
    read -p "Chave Lalamove API: " LALAMOVE_KEY
    read -p "Secret Lalamove API: " LALAMOVE_SECRET
    
    if [ -z "$LALAMOVE_KEY" ] || [ -z "$LALAMOVE_SECRET" ]; then
        echo -e "${YELLOW}⚠️  Sem credenciais Lalamove - cotações não funcionarão${NC}"
        LALAMOVE_KEY="SUA_CHAVE_LALAMOVE"
        LALAMOVE_SECRET="SEU_SECRET_LALAMOVE"
    fi
    
    echo ""
    echo -e "${CYAN}═══ Open Delivery (opcional) ═══${NC}"
    read -p "Client ID Open Delivery [deixe vazio para pular]: " OD_CLIENT_ID
    read -p "Client Secret Open Delivery: " OD_CLIENT_SECRET
    
    # Criar arquivo .env
    echo -e "${BLUE}[3/6] Criando arquivo .env...${NC}"
    
    cat > .env << EOF
# ═══════════════════════════════════════════════════════════
# MIRELLA DOCES - Configuração de Ambiente
# Gerado automaticamente em $(date)
# ═══════════════════════════════════════════════════════════

# Ambiente
NODE_ENV="${NODE_ENV}"
LOG_LEVEL="${LOG_LEVEL}"

# Banco de Dados PostgreSQL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@db:5432/${DB_NAME}?schema=public"
POSTGRES_USER="${DB_USER}"
POSTGRES_PASSWORD="${DB_PASS}"
POSTGRES_DB="${DB_NAME}"

# API Geoapify (Geocodificação e Mapas)
GEOAPIFY_API_KEY="${GEOAPIFY_KEY}"
NEXT_PUBLIC_GEOAPIFY_API_KEY="${GEOAPIFY_KEY}"

# API Lalamove (Entregas)
LALAMOVE_API_KEY="${LALAMOVE_KEY}"
LALAMOVE_API_SECRET="${LALAMOVE_SECRET}"
LALAMOVE_ENV="${LALAMOVE_ENV}"

# Open Delivery (Opcional)
OPEN_DELIVERY_CLIENT_ID="${OD_CLIENT_ID:-}"
OPEN_DELIVERY_CLIENT_SECRET="${OD_CLIENT_SECRET:-}"
OPEN_DELIVERY_BASE_URL="https://api.opendelivery.com.br"
EOF

    echo -e "${GREEN}✓ Arquivo .env criado${NC}"
fi

echo ""
echo -e "${BLUE}[4/6] Escolha como deseja iniciar o sistema:${NC}"
echo "  1) Docker Compose (recomendado)"
echo "  2) Apenas criar .env (configurar manualmente depois)"
read -p "Escolha [1/2]: " start_choice

if [ "$start_choice" == "1" ]; then
    echo ""
    echo -e "${BLUE}[5/6] Iniciando containers Docker...${NC}"
    
    # Verificar qual comando usar
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD up -d --build
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${BLUE}[6/6] Aguardando serviços iniciarem...${NC}"
        sleep 10
        
        echo ""
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}║   ✅ SISTEMA CONFIGURADO COM SUCESSO!                         ║${NC}"
        echo -e "${GREEN}║                                                               ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}Acesse o sistema em: ${YELLOW}http://localhost${NC}"
        echo ""
        echo -e "${BLUE}Comandos úteis:${NC}"
        echo "  Ver logs:        $COMPOSE_CMD logs -f"
        echo "  Parar sistema:   $COMPOSE_CMD down"
        echo "  Reiniciar:       $COMPOSE_CMD restart"
        echo "  Ver status:      $COMPOSE_CMD ps"
        echo ""
    else
        echo -e "${RED}❌ Erro ao iniciar containers${NC}"
        echo "Verifique os logs com: $COMPOSE_CMD logs"
        exit 1
    fi
else
    echo ""
    echo -e "${GREEN}✓ Configuração concluída!${NC}"
    echo ""
    echo -e "${CYAN}Para iniciar o sistema manualmente:${NC}"
    echo "  docker-compose up -d"
    echo ""
fi

echo -e "${BLUE}Documentação completa: README-DEPLOY.md${NC}"
