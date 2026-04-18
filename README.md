# RadarAcadêmico

Sistema SaaS B2B de gestão de ocorrências acadêmicas para instituições de ensino
fundamental, médio e superior.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | NestJS 10 + TypeScript |
| Banco | MySQL 8.0 |
| ORM | TypeORM |
| Deploy | Docker + Kamal |

## Setup local

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- Git

### 1. Clonar e instalar dependências

```bash
git clone git@github.com:IFPE-Jaboatao/ocorrencias-time2.git
cd ocorrencias-time2

# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite .env com seus valores locais
```

### 3. Subir banco de dados

```bash
docker compose up db -d
```

### 4. Rodar migrations

```bash
cd backend
npm run migration:run
```

### 5. Iniciar em desenvolvimento

```bash
# Terminal 1 — backend
cd backend && npm run start:dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

- Backend: http://localhost:3000
- Swagger: http://localhost:3000/api
- Frontend: http://localhost:5173

## Scripts úteis

```bash
# Rodar testes
cd backend && npm test
cd frontend && npm test

# Lint
cd backend && npm run lint
cd frontend && npm run lint

# Criar nova migration
cd backend && npm run migration:generate -- src/migrations/NomeDaMigration

# Reverter última migration
cd backend && npm run migration:revert
```

## Documentação

Veja `CLAUDE.md` para arquitetura, regras de negócio e decisões técnicas.
