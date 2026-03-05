# ═══════════════════════════════════════════════════════════
# MIRELLA DOCES — Atalhos Docker
# Uso: make <comando>
# ═══════════════════════════════════════════════════════════

.PHONY: up down restart logs build deploy update-app

## Sobe todos os serviços
up:
	docker compose up -d

## Derruba todos os serviços
down:
	docker compose down

## Reinicia apenas o app
restart:
	docker compose restart app

## Logs em tempo real do app
logs:
	docker compose logs -f app

## Status dos containers
ps:
	docker compose ps

## Build de todos os serviços
build:
	docker compose build

## Deploy completo (derruba tudo, rebuilda e sobe)
deploy:
	git pull origin main
	docker compose down
	docker compose up -d --build
	docker compose exec app npx prisma migrate deploy

## ⚡ Atualiza SOMENTE o app (banco continua rodando)
update-app:
	git pull origin main
	docker compose build app
	docker compose up -d --no-deps app
	docker compose logs -f app

## Acessa o banco via psql
db:
	docker compose exec db psql -U $${POSTGRES_USER:-mirella} -d $${POSTGRES_DB:-mirella_doces}

## Backup do banco
backup:
	docker compose exec db pg_dump -U $${POSTGRES_USER:-mirella} $${POSTGRES_DB:-mirella_doces} > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup salvo!"
