# CLAUDE.md — RadarAcadêmico

> **Leia este arquivo inteiro antes de qualquer interação de desenvolvimento.**
> Ele é o documento vivo do projeto. Toda decisão arquitetural, regra de domínio e
> hurdle conhecido está documentado aqui. Atualize-o sempre que descobrir algo novo.

---

## 1. Visão Geral do Projeto

**RadarAcadêmico** é um SaaS B2B de gestão de ocorrências acadêmicas, vendido para
instituições de ensino (fundamental, médio e superior). O produto centraliza o registro,
tramitação, notificação e análise de ocorrências — disciplinares, acadêmicas, de
frequência, físicas, de segurança, psicossociais, administrativas, éticas e de
infraestrutura.

**Problema central:** instituições gerenciam ocorrências por e-mail, planilhas e papel.
Não há rastreabilidade, os fluxos de aprovação são inconsistentes e a conformidade com
LGPD/ECA é impossível de auditar.

**Proposta de valor:** rastreabilidade completa, fluxos configuráveis por tipo de
ocorrência, conformidade legal embutida, e visibilidade controlada por papel de usuário.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão alvo |
|---|---|---|
| Frontend | React + TypeScript | 18+ |
| Backend | NestJS + TypeScript | 10+ |
| ORM | TypeORM | - |
| Banco de dados | MySQL | 8.0+ |
| Autenticação | JWT + Magic Link (Nodemailer) | - |
| Notificações | Nodemailer (SMTP) | - |
| API Docs | Swagger (via NestJS decorators) | - |
| Testes (backend) | Jest + Supertest | - |
| Testes (frontend) | Jest + React Testing Library | - |
| Lint | ESLint + Prettier | - |
| CI | GitHub Actions | - |
| Deploy | Docker + Kamal | - |

**Nunca use:** bibliotecas de autenticação externas que forcem SSO institucional.
A autenticação é própria e deve ser extensível para OAuth2/MFA sem reescrever o core.

---

## 3. Estrutura de Módulos (NestJS)

O backend é organizado em módulos independentes. Cada módulo tem seu próprio
controller, service, DTOs, entities e testes.

```
src/
  auth/             # Autenticação: JWT, magic link, sessões
  users/            # Usuários, papéis (RBAC), perfis híbridos
  students/         # Alunos, vinculação com responsáveis legais
  guardians/        # Responsáveis legais
  occurrences/      # Core: ocorrências, protocolos, histórico
  occurrence-types/ # Tipos e subtipos (configuráveis em runtime)
  workflows/        # Fluxos de aprovação configuráveis, SLAs
  notifications/    # E-mail e in-app, templates, log de envios
  audit/            # Log de auditoria imutável
  reports/          # Relatórios e dashboards
  frequency/        # Módulo de frequência/faltas (ativável por plano)
  config/           # Configurações de tenant, campi, períodos letivos
  common/           # Guards, interceptors, decorators, pipes compartilhados
```

**Regra:** nenhum módulo importa diretamente a entity de outro. Comunicação via service
ou eventos. O módulo `audit` nunca é importado por outros — outros emitem eventos e
o audit os consome.

---

## 4. Modelo de Domínio — Conceitos Críticos

### Ocorrência
A unidade central do sistema. Tem:
- **Protocolo único e imutável** gerado no momento da criação (formato: `RA-{ANO}-{SEQUENCIAL}`)
- **Tipo e subtipo** (configuráveis, não hardcoded)
- **Status** (veja estados abaixo)
- **Histórico imutável** de todas as transições de status e comentários
- Nunca é deletada do banco — apenas recebe status `ANULADA` com justificativa obrigatória

### Estados de uma Ocorrência
```
RASCUNHO → EM_INVESTIGACAO → NOTIFICADA → AGUARDANDO_DEFESA
        ↘                                              ↓
          → ANULADA (qualquer estado, com justificativa)
                                                       ↓
                                              ENCERRADA / ARQUIVADA
```

**Visibilidade para aluno/responsável:**
- `EM_INVESTIGACAO`: invisível (protege a apuração)
- `NOTIFICADA`, `AGUARDANDO_DEFESA`, `ENCERRADA`, `ARQUIVADA`: visível
- `ANULADA`: invisível (não existe para o aluno)

### RBAC — Papéis (Roles)
Papéis são granulares, não hierárquicos puros. Um usuário pode ter múltiplos papéis.

| Role | Constante no código |
|---|---|
| Aluno maior | `ROLE_STUDENT_ADULT` |
| Aluno menor | `ROLE_STUDENT_MINOR` |
| Responsável legal | `ROLE_GUARDIAN` |
| Professor/Docente | `ROLE_TEACHER` |
| Coordenador | `ROLE_COORDINATOR` |
| Secretaria | `ROLE_SECRETARY` |
| Diretor | `ROLE_DIRECTOR` |
| Orientador/NAE | `ROLE_COUNSELOR` |
| TI/Admin | `ROLE_ADMIN` |

**Guard padrão:** todas as rotas exigem autenticação. Rotas públicas têm decorator
`@Public()`. Rotas com controle de papel usam `@Roles(...)`.

### Responsável Legal
- Sempre vinculado a aluno menor de idade
- Quando uma ocorrência é aberta para um aluno menor, o responsável legal cadastrado
  é automaticamente adicionado como destinatário das notificações
- Tem acesso restrito: vê apenas ocorrências dos alunos sob sua guarda

### Log de Auditoria
- Imutável: apenas INSERT, nunca UPDATE ou DELETE
- Registra: entidade afetada, ID do usuário que agiu, IP, timestamp, ação realizada,
  justificativa (obrigatória para acesso a ocorrências de terceiros)
- É separado do histórico da ocorrência: histórico é visível no fluxo, auditoria é
  para compliance interno

---

## 5. Regras de Negócio — Tradução Técnica

> Estas são as regras que o código DEVE garantir, não apenas a interface.
> Valide-as em testes de unidade, não apenas em testes de integração.

**RN-01:** O método de encerramento de uma ocorrência deve verificar se o usuário
autenticado tem o papel competente para aquele tipo de ocorrência naquele estágio do
fluxo. Nunca confie apenas no frontend.

**RN-02:** Ao transicionar para `NOTIFICADA`, o sistema dispara notificação:
- Se aluno maior de 18 anos: para o próprio aluno (prazo: 24h após abertura da investigação)
- Se aluno menor: para o responsável legal cadastrado (obrigatório, sem exceção)

**RN-03:** Ocorrências do tipo `DISCIPLINAR` com subtipo marcado como `grave: true`
devem ser encaminhadas automaticamente para `Comissão Disciplinar` ao sair de
`EM_INVESTIGACAO`. O coordenador não pode encerrar diretamente.

**RN-05:** Job agendado ao fim de cada período letivo verifica frequência de todos os
alunos. Se abaixo do limite legal (default: 75%), gera ocorrência automaticamente com
`tipo: FREQUENCIA`, `subtipo: excesso_faltas_automatico`, `origem: SISTEMA`.

**RN-06:** O status `ANULADA` exige campo `anulada_justificativa: string` preenchido.
Registros anulados são excluídos de todas as queries de relatório com filtro
`WHERE status \!= 'ANULADA'` aplicado por padrão em todos os repositories.
O log de auditoria registra a anulação com o usuário, timestamp e justificativa.

**RN-07:** Ocorrências com `tipo.categoria = 'PSICOSSOCIAL'` têm `acesso_restrito: true`.
O guard deve verificar se o usuário tem role `ROLE_COORDINATOR`, `ROLE_COUNSELOR` ou
`ROLE_DIRECTOR` além da autenticação básica.

**RN-08:** O interceptor `AuditInterceptor` deve ser aplicado em todas as rotas de
leitura de ocorrências de terceiros. Quando o usuário acessa uma ocorrência da qual
não é o autor nem o aluno envolvido, deve registrar no log com justificativa.

**RN-09:** O service de ocorrências verifica reincidência no mesmo período letivo ao
criar uma nova ocorrência disciplinar. Se já existe ocorrência do mesmo tipo para o
mesmo aluno no período, emite evento `OccurrenceReincidenceEvent` que o módulo de
notificações transforma em alerta para Coordenador e Direção.

**RN-10:** A aprovação de compensação de ausência (`RF-05.4`) só pode ser feita por
usuários com role `ROLE_TEACHER`. O guard deve rejeitar tentativas de `ROLE_SECRETARY`
mesmo que a secretaria tenha acesso de leitura ao módulo.

**RN-11/12:** Para menores, qualquer notificação de ocorrência grave vai para o
responsável legal, não para o aluno. O service de notificação verifica `student.isMinor`
e redireciona o destinatário.

---

## 6. Autenticação — Fluxo Técnico

### Magic Link
1. Usuário informa e-mail
2. Backend gera token de 32 bytes (crypto.randomBytes), salva no banco com TTL de 15min
3. Envia e-mail com link `https://app.radaracademico.com.br/auth/verify?token=xxx`
4. Frontend chama `GET /auth/verify?token=xxx`
5. Backend valida token, gera JWT (access token 1h + refresh token 7d)
6. JWT contém: `{ sub: userId, roles: [...], tenantId }`

### JWT Guard
- Todas as rotas protegidas por `JwtAuthGuard` global
- `@Public()` decorator para rotas abertas (login, magic link request, health check)
- `@Roles(...)` decorator para controle granular por papel

### Tokens
- Access token: 1 hora, contém roles
- Refresh token: 7 dias, armazenado no banco, rotacionado a cada refresh
- Magic link token: 15 minutos, uso único

---

## 7. Módulo de Frequência — Feature Flag

O módulo de frequência (`/frequency`) é ativável/desativável por tenant via configuração.

```typescript
// Verificação no guard
if (\!tenant.features.includes('FREQUENCY_MODULE')) {
  throw new ForbiddenException('Modulo de frequencia nao habilitado neste plano');
}
```

Quando desativado:
- Rotas retornam 403
- Itens de menu não aparecem no frontend (via feature flag na API de config)
- Jobs de frequência não executam (verificam flag antes de rodar)

---

## 8. Padrões de Código

### Nomenclatura
- Entities: PascalCase singular (`Occurrence`, `OccurrenceType`)
- Tabelas MySQL: snake_case plural (`occurrences`, `occurrence_types`)
- DTOs: `CreateOccurrenceDto`, `UpdateOccurrenceStatusDto`
- Serviços: `OccurrencesService` (plural)
- Controllers: `OccurrencesController` (plural)

### Testes
- Cada service tem arquivo `*.service.spec.ts`
- Cada controller tem arquivo `*.controller.spec.ts`
- Testes de integração (e2e) em `test/` na raiz
- Mock de dependências com `jest.mock()`, nunca banco real nos testes unitários
- Factories para criar objetos de teste (padrão: `create<Entity>Mock()`)

### Migrations
- Sempre via TypeORM migrations, nunca `synchronize: true` em produção
- Nome: `{timestamp}-{descricao-kebab-case}.ts`

### Soft Delete
- Entidades críticas (Occurrence, User, Student) usam `deletedAt` (soft delete)
- Ocorrências nunca são soft-deleted — apenas recebem status `ANULADA`

---

## 9. Escopo do MVP

O MVP cobre o fluxo completo de ponta a ponta para ocorrências disciplinares simples.

**Incluso no MVP:**
- RF-01 completo: autenticação (magic link + JWT) + RBAC (4 perfis: Professor, Coordenador, Aluno/Responsável, Admin)
- RF-02 parcial: abertura de ocorrência disciplinar com protocolo único (sem anonimato)
- RF-03 parcial: fluxo linear Professor → Coordenador → Encerrada (sem SLA automático)
- RF-04 completo: visibilidade controlada por status + notificação por e-mail
- RF-06 básico: notificação por e-mail (sem templates personalizáveis)
- RNF-01, 02, 03, 04 desde o primeiro commit

**Fora do MVP (backlog):**
- RF-05 (frequência), RF-07 (relatórios), RF-08 (configuração avançada)
- MFA, fluxos distintos Ed. Básica/Superior, SLA automático, escalonamento
- Perfis: Secretaria, Diretor, Orientador/NAE (fase 2)
- Ocorrências anônimas, magic link de acesso para responsável legal sem cadastro prévio

---

## 10. Hurdles Conhecidos

> Atualize esta seção sempre que encontrar um problema não óbvio e sua solução.

**H-01: Visibilidade de ocorrência por status**
A query de busca de ocorrências para alunos/responsáveis DEVE filtrar por status visível
antes de retornar. Nunca confie que o frontend vai esconder — o backend filtra.
```typescript
// Sempre aplicar no repository quando role é STUDENT ou GUARDIAN:
.where('occurrence.status IN (:...visibleStatuses)', {
  visibleStatuses: ['NOTIFICADA', 'AGUARDANDO_DEFESA', 'ENCERRADA', 'ARQUIVADA']
})
```

**H-02: Protocolo único e sequencial**
O protocolo `RA-{ANO}-{SEQ}` deve ser gerado com lock de banco para evitar duplicatas
em requisições concorrentes. Use transação com SELECT FOR UPDATE no contador.

**H-03: Menor de idade — vínculo com responsável**
A tabela `guardian_students` é muitos-para-muitos (um responsável pode ter vários alunos,
um aluno pode ter vários responsáveis). Ao notificar, iterar por TODOS os responsáveis
ativos vinculados ao aluno.

**H-04: Histórico imutável**
A tabela `occurrence_history` tem apenas INSERT permitido. Adicionar constraint no banco
e nunca expor método de update/delete no repository. Cada transição de status gera
uma nova linha, nunca atualiza a anterior.

**H-05: Auditoria em acesso de leitura**
O interceptor de auditoria deve ser seletivo: só registra quando o usuário que acessa
NÃO é parte da ocorrência (não é o autor nem o aluno envolvido). Auditoria de toda
leitura gera ruído e degrada performance.

---

## 11. Checklist Pós-Feature

Antes de considerar qualquer feature concluída, verificar:

- [ ] Testes unitários escritos (cobertura do caminho feliz + pelo menos 2 edge cases)
- [ ] Testes de integração para as rotas novas
- [ ] Guard de RBAC aplicado na rota
- [ ] Regras de negócio relevantes validadas no service (não apenas no DTO)
- [ ] Log de auditoria emitido onde necessário
- [ ] Notificação disparada se a ação gera comunicação
- [ ] Migration de banco criada (se há mudança de schema)
- [ ] Swagger atualizado (decorators no controller e DTOs)
- [ ] Filtro `status != 'ANULADA'` aplicado em queries de relatório/listagem
- [ ] **Arquivo de documentação criado em `docs/commits/NN-escopo.md`** (gerado localmente, não versionado)

---

## 12. Convenção de Documentação de Commits

**Todo commit deve ter um arquivo `.md` correspondente em `docs/commits/`.**

A pasta `docs/commits/` está no `.gitignore` — os arquivos existem apenas localmente
para consulta do desenvolvedor e não são enviados ao repositório remoto.

### Estrutura obrigatória do documento
1. **Contexto e necessidade** — qual problema resolve e por que agora
2. **Arquivos criados/modificados** — lista com propósito de cada um
3. **Conceitos-chave** — vocabulário técnico explicado sem assumir conhecimento prévio
4. **Passo a passo** — como implementar do zero, com comandos e trechos de código
5. **Decisões de design** — tabela com decisão, alternativa e motivo
6. **Perguntas prováveis do professor** — formato P:/Resposta

### Nomeação do arquivo
```
docs/commits/NN-escopo-descricao-curta.md
```

Use o template em `docs/commits/_template.md` como ponto de partida.
Atualize o índice em `docs/commits/README.md` a cada novo documento.

---

## 12. Variáveis de Ambiente

```env
# Banco de dados
DB_HOST=localhost
DB_PORT=3306
DB_NAME=radaracademico
DB_USER=
DB_PASS=

# JWT
JWT_SECRET=
JWT_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# Magic Link
MAGIC_LINK_SECRET=
MAGIC_LINK_BASE_URL=https://app.radaracademico.com.br
MAGIC_LINK_TTL_MINUTES=15

# E-mail (SMTP)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@radaracademico.com.br

# App
NODE_ENV=development
PORT=3000
```

---

*Última atualização: Abril de 2026 — v1.0 inicial*
