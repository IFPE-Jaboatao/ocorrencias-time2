.PHONY: ci ci-backend ci-frontend test test-e2e build docker-build

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
