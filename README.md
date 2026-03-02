# Mirella Doces (Provisorio) - Sistema de Rotas
Sistema de otimização de rotas para delivery.
Eu tenho utilizado o Gerenciador Docker da Hostinger que é uma mão na roda,
Eu faço alguma atualização no projeto so da Git e subir que ele atualiza la na VPS da Hostinger
Pensando em criar outro Repositorio para Sandbox na hostinger porque aqui é o oficial
O projeto está todo documentando por dentro para você se achar mas qualquer coisa me pergunta
Se for fazer alguma alteração sobe em outra branch por favor

## 🚀 Deploy Rápido (VPS Hostinger - Atualmente)

### 1. Clonar o repositório

```bash
ssh root@SEU_IP_VPS
cd /var/www
git clone https://github.com/GuilhermeRochap/SistemaERP_Mirella/edit/master/README.md
cd mirella-doces
```

### 2. Instalar Docker (se necessário)

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker
```

### 3. Criar arquivo .env

```bash
nano .env
```

Cole o conteúdo abaixo e edite suas credenciais:

```env
NODE_ENV=production
LOG_LEVEL=warn

POSTGRES_USER=mirella
POSTGRES_PASSWORD=SuaSenhaForte123
POSTGRES_DB=mirella_doces
DATABASE_URL=postgresql://mirella:SuaSenhaForte123@db:5432/mirella_doces?schema=public

GEOAPIFY_API_KEY=sua_chave_geoapify
NEXT_PUBLIC_GEOAPIFY_API_KEY=sua_chave_geoapify

LALAMOVE_API_KEY=sua_chave_lalamove
LALAMOVE_API_SECRET=seu_secret_lalamove
LALAMOVE_ENV=production

OPEN_DELIVERY_CLIENT_ID=
OPEN_DELIVERY_CLIENT_SECRET=
OPEN_DELIVERY_BASE_URL=https://api.opendelivery.com.br
```

Salve: `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Subir o sistema

```bash
docker compose up -d --build
```

### 5. Inicializar o banco

Aguarde uns 30 segundos e rode:

```bash
docker compose exec app npx prisma db push e migrate
```

### 6. Acessar

Acesse: `http://SEU_IP_SEILAMAISOQ`

---

## 🔄 Atualizações

No seu PC:
```bash
git add .
git commit -m "Descrição"
git push
```

Na VPS:
```bash
cd /var/www/mirella-doces
git pull
docker compose up -d --build
```

---

## 🔧 Comandos Úteis

```bash
# Ver logs
docker compose logs -f

# Reiniciar
docker compose restart

# Parar
docker compose down

# Ver status
docker compose ps
```
