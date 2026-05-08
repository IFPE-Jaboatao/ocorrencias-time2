.PHONY: ci ci-backend ci-frontend test test-e2e build docker-build \
        prod-up prod-down prod-logs prod-deploy prod-seed prod-backup \
        prod-migrate

# ══════════════════════════════════════════════════════════════════════════════
#  Desenvolvimento local
# ══════════════════════════════════════════════════════════════════════════════

# Roda o CI completo (equivalente ao GitHub Actions) localmente
ci: ci-backend ci-frontend

ci-backend:
	cd backend && npm run ci

ci-frontend:
	cd frontend && npm run ci

# Atalhos individuais
test:
	cd backend && npm run test -- --forceExit

test-e2e:
	cd backend && npm run test:e2e -- --forceExit

type-check:
	cd backend  && npm run type-check
	cd frontend && npm run type-check

build:
	cd backend  && npm run build
	cd frontend && npm run build

docker-build:
	docker compose build

# ══════════════════════════════════════════════════════════════════════════════
#  Produção
# ══════════════════════════════════════════════════════════════════════════════

PROD_COMPOSE = docker compose -f docker-compose.yml -f docker-compose.prod.yml

# Primeiro deploy completo (build + up + seed)
# Uso: make prod-deploy
prod-deploy: prod-build prod-up prod-migrate prod-seed
	@echo ""
	@echo "✅ Deploy concluído! Sistema disponível em https://SEU_DOMINIO"
	@echo ""

# Apenas build das imagens
prod-build:
	$(PROD_COMPOSE) build --no-cache

# Subir todos os serviços
prod-up:
	$(PROD_COMPOSE) up -d
	@echo "Aguardando backend ficar saudável..."
	@$(PROD_COMPOSE) exec -T backend sh -c "until wget -qO- http://localhost:3001/api/v1/auth/csrf-token; do sleep 2; done"

# Parar todos os serviços (preserva volumes)
prod-down:
	$(PROD_COMPOSE) down

# Seguir logs em tempo real
prod-logs:
	$(PROD_COMPOSE) logs -f --tail=100

# Executar migrations pendentes (rodadas automaticamente no start, mas útil para forçar)
prod-migrate:
	$(PROD_COMPOSE) exec backend sh -c "node -e \"require('./dist/database/data-source').AppDataSource.initialize().then(ds => ds.runMigrations()).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })\""

# Seed de produção — interativo, cria primeiro ADMIN e categorias
# Uso: make prod-seed
prod-seed:
	$(PROD_COMPOSE) exec backend sh -c "node -e \"\" || true"
	@echo ""
	@echo "Para rodar o seed interativo, execute:"
	@echo "  docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend"
	@echo "    sh -c 'cd /app && node -r tsconfig-paths/register dist/database/seeds/seed-prod.js'"
	@echo ""

# Backup manual imediato do banco de dados
# O db-backup já roda automaticamente a cada 24h via container
prod-backup:
	$(PROD_COMPOSE) exec db sh -c \
	  "mysqldump -u$$MYSQL_USER -p$$MYSQL_PASSWORD $$MYSQL_DATABASE | gzip > /tmp/backup_manual_$$(date +%Y%m%d_%H%M%S).sql.gz && echo 'Backup criado em /tmp/'"

# Atualização do sistema (re-build e reinício sem downtime do banco)
prod-update:
	$(PROD_COMPOSE) build backend frontend
	$(PROD_COMPOSE) up -d --no-deps backend frontend
	@echo "✅ Backend e frontend atualizados"
