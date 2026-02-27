# 🚀 Guia de Deploy - Mirella Doces Delivery

## 📋 Índice

1. [Requisitos](#requisitos)
2. [Estrutura de Ambientes](#estrutura-de-ambientes)
3. [Deploy na VPS Hostinger](#deploy-na-vps-hostinger)
4. [Configuração de Variáveis](#configuração-de-variáveis)
5. [Comandos Úteis](#comandos-úteis)
6. [Troubleshooting](#troubleshooting)

---

## 📦 Requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- Mínimo 2GB RAM, 2 vCPU
- Docker e Docker Compose
- Git
- Domínio configurado (opcional, mas recomendado)

---

## 🏗️ Estrutura de Ambientes

### Desenvolvimento (Local)
```bash
# Subir bancos de dados de dev/teste
docker-compose -f docker-compose.dev.yml up -d

# Acessar pgAdmin: http://localhost:5050
# Email: admin@mirella.com | Senha: admin123

# Rodar aplicação local
cd nextjs_space
cp ../.env.development .env
yarn dev
```

### Produção (VPS)
```bash
# Usar o docker-compose principal
docker-compose up -d
```

---

## 🖥️ Deploy na VPS Hostinger

### Passo 1: Conectar na VPS

```bash
ssh root@SEU_IP_VPS
# ou com chave SSH
ssh -i sua_chave.pem root@SEU_IP_VPS
```

### Passo 2: Instalar dependências

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Instalar Git
apt install git -y
```

### Passo 3: Clonar repositório

```bash
cd /opt
git clone https://github.com/SEU_USUARIO/mirella-doces-delivery.git
cd mirella-doces-delivery
```

### Passo 4: Configurar variáveis de ambiente

```bash
# Copiar template
cp .env.example .env

# Editar com suas configurações
nano .env
```

**⚠️ IMPORTANTE: Configure todos os valores no .env!**

### Passo 5: Executar deploy

```bash
# Dar permissão ao script
chmod +x scripts/deploy.sh

# Executar deploy
./scripts/deploy.sh
```

### Passo 6: Executar migrations do banco

```bash
docker-compose exec app npx prisma migrate deploy
```

---

## ⚙️ Configuração de Variáveis

### Variáveis Obrigatórias

| Variável | Descrição | Exemplo |
|----------|-----------|--------|
| `DB_USER` | Usuário do PostgreSQL | `postgres` |
| `DB_PASSWORD` | Senha do PostgreSQL | `MinhaS3nh4F0rt3!` |
| `DB_NAME` | Nome do banco | `mirella_doces_prod` |
| `NEXTAUTH_URL` | URL da aplicação | `https://mirella.com.br` |
| `GEOAPIFY_API_KEY` | Chave Geoapify | `abc123...` |
| `LALAMOVE_API_KEY` | Chave Lalamove (produção) | `pk_live_...` |
| `LALAMOVE_API_SECRET` | Secret Lalamove | `sk_live_...` |

### Configurar domínio (Hostinger)

1. Acesse o painel da Hostinger
2. Vá em **DNS/Nameservers**
3. Adicione um registro **A**:
   - Nome: `@` (ou seu subdomínio)
   - Valor: IP da sua VPS
   - TTL: 3600

---

## 🔧 Comandos Úteis

### Gerenciamento de Containers

```bash
# Ver status dos containers
docker-compose ps

# Ver logs em tempo real
docker-compose logs -f app

# Reiniciar aplicação
docker-compose restart app

# Parar tudo
docker-compose down

# Rebuild e subir
docker-compose up -d --build
```

### Banco de Dados

```bash
# Acessar console do PostgreSQL
docker-compose exec db psql -U postgres -d mirella_doces_prod

# Backup do banco
docker-compose exec db pg_dump -U postgres mirella_doces_prod > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker-compose exec -T db psql -U postgres -d mirella_doces_prod < backup.sql

# Executar migrations
docker-compose exec app npx prisma migrate deploy
```

### Atualizar aplicação

```bash
cd /opt/mirella-doces-delivery
git pull origin main
docker-compose down
docker-compose up -d --build
docker-compose exec app npx prisma migrate deploy
```

---

## 🔒 Segurança

### Configurar Firewall (UFW)

```bash
# Habilitar UFW
ufw enable

# Permitir SSH
ufw allow 22

# Permitir HTTP/HTTPS
ufw allow 80
ufw allow 443

# Permitir porta da aplicação
ufw allow 3000

# Ver status
ufw status
```

### Configurar SSL com Nginx (Recomendado)

```bash
# Instalar Nginx e Certbot
apt install nginx certbot python3-certbot-nginx -y

# Criar configuração
nano /etc/nginx/sites-available/mirella
```

```nginx
server {
    listen 80;
    server_name seu-dominio.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ativar site
ln -s /etc/nginx/sites-available/mirella /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Obter certificado SSL
certbot --nginx -d seu-dominio.com.br
```

---

## 🐛 Troubleshooting

### Erro: Container não inicia

```bash
# Ver logs detalhados
docker-compose logs app

# Verificar se porta está em uso
lsof -i :3000
```

### Erro: Banco não conecta

```bash
# Verificar se banco está rodando
docker-compose ps db

# Testar conexão
docker-compose exec db pg_isready
```

### Erro: Migrations falharam

```bash
# Verificar status das migrations
docker-compose exec app npx prisma migrate status

# Forçar reset (CUIDADO: apaga dados!)
docker-compose exec app npx prisma migrate reset --force
```

### Memória insuficiente

```bash
# Criar swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs: `docker-compose logs -f`
2. Consulte este guia de troubleshooting
3. Verifique a documentação oficial do Next.js e Prisma

---

**Desenvolvido com ❤️ para Mirella Doces**
