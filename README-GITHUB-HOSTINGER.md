# 🚀 Deploy via GitHub → Hostinger VPS

## Passo 1: Preparar o Repositório Local

```bash
# Extrair o pacote
unzip mirella_doces_sistema.zip
cd mirella_doces_export

# Inicializar Git
git init
git add .
git commit -m "Initial commit - Mirella Doces Sistema"
```

## Passo 2: Criar Repositório no GitHub

1. Acesse https://github.com/new
2. Crie um repositório (pode ser privado)
3. **NÃO** inicialize com README/gitignore

```bash
# Conectar ao GitHub (substitua pela sua URL)
git remote add origin https://github.com/SEU_USUARIO/mirella-doces.git
git branch -M main
git push -u origin main
```

## Passo 3: Conectar na VPS Hostinger

```bash
# Conectar via SSH
ssh root@SEU_IP_HOSTINGER

# Instalar Docker (se não tiver)
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Instalar Docker Compose
apt update && apt install -y docker-compose

# Clonar o repositório
cd /var/www
git clone https://github.com/SEU_USUARIO/mirella-doces.git
cd mirella-doces
```

## Passo 4: Configurar Ambiente na VPS

```bash
# Criar arquivo .env de PRODUÇÃO
cp .env.example .env
nano .env
```

**Edite o `.env` com suas credenciais de PRODUÇÃO:**

```env
# IMPORTANTE: Mude para produção!
NODE_ENV=production
LOG_LEVEL=warn

# Banco (o Docker vai criar)
DATABASE_URL=postgresql://mirella:SUA_SENHA_FORTE@db:5432/mirella_doces
POSTGRES_USER=mirella
POSTGRES_PASSWORD=SUA_SENHA_FORTE
POSTGRES_DB=mirella_doces

# APIs
GEOAPIFY_API_KEY=sua_chave_geoapify
NEXT_PUBLIC_GEOAPIFY_API_KEY=sua_chave_geoapify
LALAMOVE_API_KEY=sua_chave_lalamove_producao
LALAMOVE_API_SECRET=seu_secret_lalamove_producao
LALAMOVE_ENV=production
```

## Passo 5: Subir o Sistema

```bash
# Buildar e iniciar
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Verificar se está rodando
docker-compose ps
```

## Passo 6: Configurar Domínio (Opcional)

Se tiver domínio, configure o DNS apontando para o IP da VPS e use Nginx como proxy reverso.

---

## 🔄 Atualizações Futuras

Quando fizer alterações no código:

**No seu computador:**
```bash
git add .
git commit -m "Descrição da alteração"
git push
```

**Na VPS Hostinger:**
```bash
cd /var/www/mirella-doces
git pull
docker-compose up -d --build
```

---

## ⚠️ Importante

- O arquivo `.env` **NÃO** vai para o GitHub (está no `.gitignore`)
- Você deve criar o `.env` manualmente na VPS
- O banco de dados é criado automaticamente pelo Docker
- Os dados ficam persistentes no volume Docker

---

## 🔧 Comandos Úteis

```bash
# Ver logs em tempo real
docker-compose logs -f

# Reiniciar
docker-compose restart

# Parar
docker-compose down

# Parar e remover volumes (CUIDADO: apaga dados!)
docker-compose down -v

# Ver status
docker-compose ps

# Acessar terminal do container
docker-compose exec app sh

# Acessar banco de dados
docker-compose exec db psql -U mirella -d mirella_doces
```
