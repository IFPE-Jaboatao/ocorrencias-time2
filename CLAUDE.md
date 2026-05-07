# CLAUDE.md — SGOA: Sistema de Gestão de Ocorrências Acadêmicas

> **Para o agente de IA:** Leia este documento **inteiro** antes de qualquer interação.
> Ele é a memória viva do projeto. Cada seção foi escrita para eliminar contexto
> perdido entre sessões. Se descobrir algo novo (um hurdle, um padrão, uma decisão),
> documente aqui antes de fechar a sessão.


## Índice de Navegação Rápida

> **Implementando feature:** §21.3 ordem → §5 entidades → §7 regras de negócio → §8 SLA → §11 RBAC → §13 legal
> **Escrevendo testes:** §19 estratégia → §15 checklist de PR
> **Problema recorrente:** §9 hurdles conhecidos
> **Revisando PR:** §15 checklist + §20.5 checklists de qualidade
> **Novo módulo:** §4 estrutura → §17 glossário → §18 atualizar DOC_EDUCATIVO.md
> **Seções de referência** (não releia inteiro a cada sessão): §3 env vars · §16 filosofia · §19 templates · §22 enums
> **Iniciando módulo novo:** §21.3 ordem de implementação → §21.1 convenções de API → §21.2 JWT payload
> **Fazendo commit:** §23.1 formato → §23.3 escopos → §23.7 checklist

---

## 1. Visão Geral do Projeto

O **SGOA** é um sistema web para gestão do ciclo de vida completo de ocorrências
acadêmicas em uma **Instituição de Ensino Mista** (Ensino Fundamental, Médio e Superior).

O sistema registra, classifica, encaminha e arquiva ocorrências disciplinares,
acadêmicas, comportamentais e de saúde/bem-estar de alunos. Todos os fluxos são
diferenciados por segmento de ensino e regulados pelas obrigações do **ECA** e da
**LGPD**.

### Por que este sistema é crítico

- Envolve dados de **menores de idade** → restrições do ECA + LGPD art. 14
- Gera **efeitos legais** (disciplinares, judiciais) → toda decisão exige trilha de
  auditoria imutável
- Serve múltiplos stakeholders com **interesses conflitantes** (professor, aluno,
  responsável, Conselho Tutelar, Ministério Público)
- Falha de notificação a responsável legal em ocorrência de severidade ≥ 3 é
  **infração legal**, não apenas bug de produto

### Fonte de Verdade dos Requisitos

- `ERS_SGOA_v1.0.docx` — Especificação de Requisitos de Sistema (Baseline v1.0, Abril/2026)
- `Prototipo Requisitos de Sistema.pdf` — protótipo original (referência histórica; **não usar
  como fonte de verdade**, a ERS corrige 14 lacunas críticas desse documento)

---

## 2. Stack Tecnológico

> **Linguagem unificada: TypeScript 5.x em toda a stack.**
> Frontend (Next.js) e backend (NestJS) compartilham a mesma linguagem, o mesmo
> compilador e o mesmo sistema de tipos. Isso significa que tipos de domínio
> (`Ocorrencia`, `StatusOcorrencia`, `PerfilUsuario`) podem ser compartilhados
> via pacote interno — sem reescrever as mesmas interfaces em duas linguagens
> diferentes, sem divergência de contratos entre as camadas.

### Backend

| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Linguagem | TypeScript | 5.x |
| Framework | NestJS | 10.x |
| ORM | TypeORM | 0.3.x |
| Banco de dados | MySQL | 8.0 |
| Agendamento de tarefas | @nestjs/schedule | 4.x |
| Autenticação SSO | Passport.js (passport-azure-ad / passport-google-oauth20) | — |
| Autorização RBAC | NestJS Guards + Decorators customizados | — |
| Notificações real-time | NestJS WebSockets (Socket.io) | — |
| Upload de arquivos | Multer + AWS S3 SDK v3 | — |
| Antivírus/sandbox | ClamAV (self-hosted) ou SaaS API | — |
| Testes | Jest + Supertest | — |
| Análise de segurança | npm audit + Snyk (opcional) | — |
| Estilo de código | ESLint + Prettier | — |
| Validação de entrada | class-validator + class-transformer | — |

### Frontend

| Camada | Tecnologia | Versão mínima |
|---|---|---|
| Framework | Next.js (App Router) | 14.x |
| Biblioteca UI | React | 18.x |
| Linguagem | TypeScript | 5.x |
| Gerenciamento de estado remoto | TanStack Query (React Query) | 5.x |
| Formulários | React Hook Form + Zod | — |
| Estilo | Tailwind CSS | 3.x |
| Testes | Jest + React Testing Library + Playwright (E2E) | — |

### Infra / Deploy

| Item | Tecnologia |
|---|---|
| Deploy | Docker + Docker Compose / Kamal 2 |
| Monitoramento | Sentry (erros) + Prometheus/Grafana |

### Decisões de Arquitetura Já Tomadas

> **TypeScript strict mode obrigatório.** Ambos os projetos (frontend e backend)
> devem ter `"strict": true` no `tsconfig.json`. Isso habilita `strictNullChecks`,
> `noImplicitAny`, e `strictPropertyInitialization` — eliminando uma classe inteira
> de bugs em runtime antes do código chegar ao banco de dados.

0. **Simplicidade antes de padrões** — os padrões deste documento (Clean Architecture,
   DDD, SOLID) são ferramentas para controlar complexidade, não objetivos em si mesmos.
   Quando aplicar um padrão torna o código mais complexo do que o problema que resolve,
   abandone o padrão e escreva a solução mais simples que funcione corretamente.
   A pergunta a fazer sempre é: *"isso existe porque o problema exige, ou porque parece
   elegante?"* Ver Seção 10 (P-11) e Seção 20.6 para as regras práticas de aplicação.

1. **Separação frontend / backend** — Next.js (App Router) consome a API REST do
   NestJS. O Next.js também pode fazer Server-Side Rendering para páginas públicas
   (ciência formal de responsáveis). Nunca colocar lógica de negócio no Next.js;
   ele é exclusivamente camada de apresentação e roteamento.
2. **Arquitetura em camadas no backend (NestJS):**
   - **Modules** — fronteiras de domínio (AuthModule, OcorrenciasModule, etc.)
   - **Controllers** — recebem HTTP, validam DTO, delegam ao Service. Nunca contêm lógica de negócio.
   - **Services** — contêm toda lógica de negócio. São os únicos que chamam Repositories.
   - **DTOs** — definem e validam a forma dos dados de entrada com `class-validator`.
   - **Entities** — mapeiam tabelas MySQL via TypeORM. Nunca expor entidades diretamente na resposta HTTP; usar DTOs de resposta (ResponseDto).
   - **Repositories** — acesso a dados via TypeORM. Services nunca chamam `EntityManager` diretamente.
3. **SSO obrigatório** — sem autenticação local própria. O sistema não armazena
   senhas. Token SSO carrega: `nome`, `email`, `perfil`, `campus`, `segmento`.
4. **RBAC via Guards NestJS** — `RolesGuard` injetado globalmente, `@Roles()`
   decorator nos controllers. Scoping de dados fica no Service, nunca no Controller.
5. **Audit log append-only** — tabela `auditorias` sem UPDATE/DELETE no banco.
   Enforçado via trigger MySQL (ver H-04) + `AuditInterceptor` no NestJS.
6. **Evidências criptografadas** — AES-256 at rest no S3 (Server-Side Encryption).
   URLs de acesso são S3 Pre-signed URLs com TTL de 15 minutos.
7. **Multi-segmento por dado, não por aplicação** — não há três apps separados.
   O campo `segmento` no `Aluno` e na `Ocorrencia` direciona lógica de negócio.
8. **MySQL: sem tipo `jsonb`** — usar coluna `json` para campos semi-estruturados
   (ex: `valor_anterior` e `valor_novo` na tabela `auditorias`). Sem arrays nativos:
   usar colunas `json` ou tabelas de relacionamento para campos multi-valor.

---

## 3. Variáveis de Ambiente

> Arquivo completo em `.env.example` na raiz. Abaixo apenas as variáveis
> não-óbvias ou críticas para o SGOA (as demais seguem padrões de mercado).

```bash
# Sessão — RF-01: expira após 8h de inatividade
SESSION_TIMEOUT_HOURS=8

# SSO: claims customizados variam por tenant Azure AD — ver H-01
SSO_CLAIM_PERFIL=extension_perfil_sgoa
SSO_CLAIM_CAMPUS=extension_campus_code
SSO_CLAIM_SEGMENTO=extension_segmento
OAUTH_ALLOWED_DOMAIN=escola.edu.br    # rejeita logins fora do domínio institucional

# JWT interno (emitido após validação SSO)
JWT_EXPIRES_IN=8h

# Banco de teste (CI/CD)
TEST_DB_DATABASE=sgoa_test            # nunca usar sgoa_production nos testes

# Criptografia — AES-256-GCM para CPF e dados sensíveis (P-10)
ENCRYPTION_KEY=<hex 64 chars>   # openssl rand -hex 32 → 32 bytes = 256 bits

# AWS S3 — evidências e relatórios exportados
AWS_REGION=us-east-1
AWS_S3_BUCKET=sgoa-evidencias
AWS_ACCESS_KEY_ID=<key>
AWS_SECRET_ACCESS_KEY=<secret>
S3_PRESIGNED_TTL_SECONDS=900    # 15 min — decisão §2.6

# E-mail (usado pelo NotificacoesService via @nestjs/schedule)
SMTP_HOST=smtp.escola.edu.br
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=noreply@escola.edu.br
EMAIL_USER=<user>
EMAIL_PASS=<pass>

# ClamAV (antivírus de uploads — H-02)
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# Monitoramento
SENTRY_DSN=https://<key>@sentry.io/<project>

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000       # CORS — ver H-14
```

---

## 4. Estrutura de Diretórios

### Backend — NestJS (`/backend`)

```
src/
  modules/                          # cada pasta = um NestJS Module (domínio)
    auth/
      auth.module.ts
      auth.controller.ts            # POST /auth/sso/callback
      auth.service.ts
      strategies/
        azure-ad.strategy.ts        # passport-azure-ad
        jwt.strategy.ts             # passport-jwt (tokens internos)
      guards/
        jwt-auth.guard.ts
        roles.guard.ts              # verifica @Roles() no handler
      decorators/
        roles.decorator.ts          # @Roles(PerfilUsuario.COORDENADOR)
        current-user.decorator.ts   # @CurrentUser() nos controllers
      dto/
        sso-callback.dto.ts
    alunos/
      alunos.module.ts
      alunos.controller.ts
      alunos.service.ts
      dto/
        buscar-aluno.dto.ts
        aluno-response.dto.ts
      entities/
        aluno.entity.ts
      repositories/
        aluno.repository.ts
    responsaveis/
      (estrutura idêntica)
    ocorrencias/
      ocorrencias.module.ts
      ocorrencias.controller.ts
      ocorrencias.service.ts        # lógica de negócio principal
      dto/
        create-ocorrencia.dto.ts    # validação class-validator
        update-ocorrencia.dto.ts
        filter-ocorrencia.dto.ts
        ocorrencia-response.dto.ts  # nunca expor Entity diretamente
      entities/
        ocorrencia.entity.ts
      repositories/
        ocorrencia.repository.ts
      enums/
        status-ocorrencia.enum.ts
        severidade.enum.ts
    validacoes/
    encaminhamentos/
    notificacoes/
      notificacoes.module.ts
      notificacoes.service.ts
      tasks/
        email-notification.task.ts    # @nestjs/schedule — envio assíncrono de e-mails
        inapp-notification.task.ts
      gateways/
        notificacoes.gateway.ts     # WebSocket gateway (Socket.io)
    evidencias/
      evidencias.service.ts
      upload.service.ts             # S3 + magic bytes + ClamAV
    relatorios/
      relatorios.service.ts
      tasks/
        relatorio-generator.task.ts
    auditoria/
      auditoria.service.ts
      entities/
        auditoria.entity.ts         # append-only (ver H-04)
    categorias/
    sla/
      sla.service.ts
      tasks/
        sla-monitor.task.ts    # roda a cada 15 min via @nestjs/schedule @Cron
        sla-escalation.task.ts
    ciencia-formal/
  common/
    interceptors/
      audit.interceptor.ts          # registra auditoria globalmente
      serialize.interceptor.ts      # transforma Entity → ResponseDto
    filters/
      http-exception.filter.ts
    pipes/
      validation.pipe.ts            # ValidationPipe global
    guards/                         # Guards reutilizáveis
    decorators/
    interfaces/
      authenticated-user.interface.ts
  config/
    database.config.ts              # TypeORM datasource MySQL
    jwt.config.ts
  database/
    migrations/                     # TypeORM migrations (nunca sync: true em prod)
  main.ts
```

### Frontend — Next.js (`/frontend`)

```
src/
  app/
    (auth)/
      login/
        page.tsx                    # redireciona para SSO
    (protected)/
      layout.tsx                    # wrapper com AuthGuard
      dashboard/
        page.tsx
      ocorrencias/
        page.tsx                    # listagem
        nova/
          page.tsx                  # formulário registro (RF-03)
        [id]/
          page.tsx
          validar/
            page.tsx
      alunos/
      relatorios/
    ciencia/
      [token]/
        page.tsx                    # página pública — ciência formal (RF-12)
  components/
    ui/                             # componentes genéricos (Button, Badge, etc.)
    ocorrencias/
      OcorrenciaCard.tsx
      SeveridadeBadge.tsx           # nunca duplicar — usar este componente
      SlaIndicator.tsx
      FormularioOcorrencia.tsx
    shared/
      NotificacaoPanel.tsx          # painel real-time via WebSocket
  lib/
    api/
      ocorrencias.api.ts            # funções de chamada à API NestJS
      alunos.api.ts
    hooks/
      useOcorrencias.ts             # TanStack Query hooks
      useCurrentUser.ts
    auth/
      session.ts                    # gerenciamento de sessão JWT
  types/
    ocorrencia.types.ts
    usuario.types.ts
  middleware.ts                     # proteção de rotas Next.js
```

---

## 5. Entidades e Modelo de Dados

> **Regra absoluta:** campos marcados com `[enc]` são armazenados criptografados
> (AES-256). Jamais logar ou serializar esses valores em texto plano.
>
> **Regra MySQL:** não existe tipo `jsonb` no MySQL. Usar coluna `json` para campos
> semi-estruturados. Não existe tipo array nativo — usar `json` ou tabela auxiliar.
>
> **Regra TypeORM:** nunca usar `synchronize: true` em produção. Toda mudança de
> schema via migration (`typeorm migration:generate` + `migration:run`).

### 5.1 Aluno
```typescript
@Entity('alunos')
export class Aluno {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       matricula: string;
  @Column()                       nome: string;
  @Column({ type: 'date' })       dataNascimento: Date;
  @Column({ select: false })      cpfEncriptado: string;  // [enc] — AES-256
  @Column({ nullable: true })     fotoUrl: string;
  @Column({ type: 'enum', enum: Segmento })   segmento: Segmento;
  @Column()                       campus: string;
  @Column()                       curso: string;
  @Column()                       turma: string;
  @Column({ type: 'enum', enum: StatusAluno, default: StatusAluno.ATIVO })
                                  status: StatusAluno;
  @CreateDateColumn()             criadoEm: Date;
  @UpdateDateColumn()             atualizadoEm: Date;

  @OneToMany(() => ResponsavelLegal, r => r.aluno)
  responsaveisLegais: ResponsavelLegal[];  // obrigatório se idade < 18 anos

  @OneToMany(() => Ocorrencia, o => o.aluno)
  ocorrencias: Ocorrencia[];
}
```

### 5.2 ResponsavelLegal ★
```typescript
@Entity('responsaveis_legais')
export class ResponsavelLegal {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Aluno)         aluno: Aluno;
  @Column()                       nome: string;
  @Column({ select: false })      cpfEncriptado: string;  // [enc]
  @Column()                       parentesco: string;
  @Column()                       email: string;
  @Column()                       telefone: string;
  @Column({ default: true })      receberNotificacoes: boolean;
  @Column({ nullable: true, type: 'datetime' }) validadoEm: Date;
}
```
★ Entidade nova — ausente no protótipo original.

### 5.3 Usuario
```typescript
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       nome: string;
  @Column({ unique: true })       email: string;
  @Column({ select: false })      cpfEncriptado: string;  // [enc]
  @Column({ type: 'enum', enum: PerfilUsuario }) perfil: PerfilUsuario;
  @Column()                       campus: string;
  @Column({ type: 'json' })       segmentosResponsaveis: Segmento[];  // json — sem array nativo no MySQL
  @Column({ default: true })      ativo: boolean;
  @Column({ nullable: true, type: 'datetime' }) ultimoAcesso: Date;
}
```

### 5.4 Ocorrencia
```typescript
@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       codigo: string;  // OC-2026-00142-FM
  @ManyToOne(() => Aluno)         aluno: Aluno;
  @ManyToOne(() => Usuario)       registrador: Usuario;
  @ManyToOne(() => CategoriaOcorrencia) categoria: CategoriaOcorrencia;
  @Column({ nullable: true })     subcategoria: string;
  @Column({ type: 'tinyint' })    severidade: number;  // 1..5
  @Column({ type: 'date' })       dataIncidente: Date;
  @Column()                       local: string;
  @Column({ type: 'text' })       descricao: string;
  @Column({ type: 'enum', enum: StatusOcorrencia, default: StatusOcorrencia.ABERTA })
                                  status: StatusOcorrencia;
  @Column({ type: 'enum', enum: CienciaFormalStatus, default: CienciaFormalStatus.PENDENTE })
                                  cienciaFormalStatus: CienciaFormalStatus;
  @Column({ nullable: true, type: 'datetime' }) dataResolucao: Date;
  @Column({ nullable: true, type: 'datetime' }) slaPrazo: Date;       // calculado por SlaService.calcularPrazo()
  @CreateDateColumn()             criadoEm: Date;
  @UpdateDateColumn()             atualizadoEm: Date;

  @OneToMany(() => ValidacaoOcorrencia, v => v.ocorrencia) validacoes: ValidacaoOcorrencia[];
  @OneToMany(() => Encaminhamento, e => e.ocorrencia)      encaminhamentos: Encaminhamento[];
  @OneToMany(() => Notificacao, n => n.ocorrencia)         notificacoes: Notificacao[];
  @OneToMany(() => CienciaFormal, c => c.ocorrencia)       ciencias: CienciaFormal[];
  @OneToMany(() => Comentario, c => c.ocorrencia)          comentarios: Comentario[];
}
```

**Geração do código único:** ver **H-13** — implementação com tabela `codigo_sequencia`
(atômica, sem race condition). A versão ingênua com `COUNT + 1` **não deve ser usada**.

### 5.5 ValidacaoOcorrencia ★
```
id (uuid), ocorrencia_id, validador_id,
tipo_decisao ENUM[VALIDAR|DEVOLVER|ESCALAR],
justificativa VARCHAR(1000) — mín. 30 chars (validado no DTO),
data_decisao DATETIME,
severidade_anterior TINYINT, severidade_nova TINYINT
```

### 5.6 Encaminhamento
```
id (uuid), ocorrencia_id, tipo VARCHAR, responsavel_id, prazo DATE,
descricao TEXT, status ENUM[PENDENTE|EXECUTADO|VENCIDO],
data_execucao DATETIME (nullable), resultado_registrado TEXT (nullable)
```

### 5.7 Notificacao
```
id (uuid), ocorrencia_id, destinatario_tipo VARCHAR,
destinatario_id (uuid), canal ENUM[EMAIL|IN_APP],
evento VARCHAR, status ENUM[ENVIADO|FALHOU|LIDO],
data_envio DATETIME, data_leitura DATETIME (nullable)
```

### 5.8 CienciaFormal ★
```
id (uuid), ocorrencia_id,
destinatario_tipo ENUM[ALUNO|RESPONSAVEL], destinatario_id (uuid),
token_hash VARCHAR(64)  — SHA-256, uso único,
data_envio DATETIME, data_confirmacao DATETIME (nullable, preenchido = token inválido),
ip_confirmacao VARCHAR(45) (nullable),
user_agent TEXT (nullable),
hash_conteudo VARCHAR(64) — SHA-256 do snapshot apresentado ao destinatário
```

### 5.9 Auditoria (append-only)
```
id BIGINT AUTO_INCREMENT,         — inteiro sequencial, não UUID (performance em insert)
ocorrencia_id (uuid, nullable),
ator_id (uuid), perfil_ator VARCHAR,
acao VARCHAR,                     — ex: 'CREATE_OCORRENCIA', 'CHANGE_STATUS'
entidade VARCHAR, entidade_id VARCHAR,
valor_anterior JSON (nullable),   — MySQL json, não jsonb
valor_novo JSON (nullable),
ip VARCHAR(45), timestamp DATETIME(6)
```
> Enforçar imutabilidade via triggers MySQL (ver H-04). O `AuditInterceptor`
> do NestJS registra automaticamente no after de cada operação crítica.

### 5.10 CategoriaOcorrencia ★ (configurável pelo Admin)
```
id (uuid), nome VARCHAR,
subcategorias JSON,               — array de strings, ex: ["Bullying","Cyberbullying"]
severidade_padrao TINYINT, sla_horas INT,
exige_notif_responsavel BOOLEAN,
obrigatorioLegal BOOLEAN DEFAULT false,  — bloqueia opt-out de notificação (P-07)
segmentos_aplicaveis JSON,        — ex: ["FUNDAMENTAL","MEDIO"]
exige_validacao BOOLEAN,
ativo BOOLEAN DEFAULT true,       — desativação lógica (RF-15)
protocolo_externo VARCHAR (nullable)  — ex: 'CONSELHO_TUTELAR'
```

### 5.11 Comentario ★
```typescript
@Entity('comentarios')
export class Comentario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia)    ocorrencia: Ocorrencia;
  @ManyToOne(() => Usuario, { nullable: true }) autor: Usuario | null;
  @Column()                       autorNome: string;       // desnormalizado — pode ser aluno externo
  @Column({ type: 'enum', enum: TipoComentario })
                                  tipo: TipoComentario;
  @Column({ type: 'text' })       conteudo: string;
  @Column({ default: false })     confidencial: boolean;   // true = só COORD/DIRETOR/ADMIN
  @CreateDateColumn()             criadoEm: Date;
}
// TipoComentario: OBSERVACAO | CONTRARRAZAO | NOTA_COMPLIANCE
// CONTRARRAZAO só permitido para aluno SUPERIOR após validação (RN-13)
// NOTA_COMPLIANCE permitido mesmo em ocorrência ARQUIVADA (RN-12)
```
★ Entidade nova — referenciada em Ocorrencia.comentarios mas ausente no protótipo.

### 5.12 Índices de Banco de Dados (adicionar nas migrations)
```sql
-- Ocorrências — queries mais frequentes do sistema
CREATE INDEX idx_ocorrencias_aluno      ON ocorrencias(aluno_id);
CREATE INDEX idx_ocorrencias_status     ON ocorrencias(status);
CREATE INDEX idx_ocorrencias_severidade ON ocorrencias(severidade);
CREATE INDEX idx_ocorrencias_registrador ON ocorrencias(registrador_id);
CREATE INDEX idx_ocorrencias_criado_em  ON ocorrencias(criado_em);

-- Auditoria — queries por ocorrência e por ator (compliance)
CREATE INDEX idx_auditorias_ocorrencia  ON auditorias(ocorrencia_id);
CREATE INDEX idx_auditorias_ator        ON auditorias(ator_id);
CREATE INDEX idx_auditorias_timestamp   ON auditorias(timestamp);

-- Notificações — fila de leitura e reenvio
CREATE INDEX idx_notificacoes_dest      ON notificacoes(destinatario_id, status);

-- SLA — MonitorProcessor consulta por status + prazo a cada 15 min
CREATE INDEX idx_ocorrencias_sla        ON ocorrencias(status, sla_prazo);
```
> `sla_prazo` é uma coluna DATETIME calculada no `OcorrenciasService.criar()`
> via `SlaService.calcularPrazo()` e persistida na ocorrência para evitar
> recalcular a cada varredura do `SlaMonitorProcessor`.


---

## 6. Mapa de Requisitos Funcionais

| ID | Nome | Prioridade | Status |
|---|---|---|---|
| RF-01 | Autenticação SSO + RBAC | Must Have | — |
| RF-02 | Busca de aluno com escopo | Must Have | — |
| RF-03 | Registro de ocorrência | Must Have | — |
| RF-04 | Workflow de validação por severidade | Must Have | — |
| RF-05 | Encaminhamentos e plano de ação | Must Have | — |
| RF-06 | Ciclo de vida e status da ocorrência | Must Have | — |
| RF-07 | Gestão de evidências e anexos | Must Have | — |
| RF-08 | Sistema de notificações | Must Have | — |
| RF-09 | Dashboard e acompanhamento | Should Have | — |
| RF-10 | Histórico e trilha de auditoria | Must Have | — |
| RF-11 | Relatórios exportáveis | Should Have | — |
| RF-12 | Ciência formal do aluno/responsável | Should Have | — |
| RF-13 | Alerta de reincidência | Should Have | — |
| RF-14 | Gestão de usuários e perfis | Must Have | — |
| RF-15 | Gestão de categorias e campus | Must Have | — |

**Fora de escopo da v1:** integração com sistema acadêmico externo, portal mobile
para responsáveis, análise preditiva de evasão, assinatura digital ICP-Brasil.
Ver Seção 10 da ERS para lista completa de Won't Have (v1).

---

## 7. Regras de Negócio Críticas

> Estas regras devem ser enforçadas na **camada de modelo/service**, nunca apenas
> na controller ou na view. Cada violação deve lançar uma exceção de negócio
> específica e gerar entrada na tabela `auditorias`.

| ID | Regra | Onde enforçar (NestJS) |
|---|---|---|
| RN-01 | Ocorrência exige aluno com matrícula ativa | `OcorrenciasService.criar()` — verificar status do aluno antes de persistir |
| RN-02 | Sev. ≥ 4 exige validação antes de efeito formal | `ValidacoesService` + `RolesGuard` no endpoint de validação |
| RN-03 | ≥ 3 ocorrências da mesma categoria em 30 dias → alerta de reincidência | `OcorrenciasService.criar()` — query de contagem pós-persistência |
| RN-04 | Alteração em status "Resolvida"/"Arquivada" exige justificativa + aprovação Admin | `OcorrenciasService.alterarStatus()` — verificar perfil + exigir DTO com justificativa |
| RN-05 | Menores de 18 anos: notificação responsável obrigatória (Sev. ≥ 3) | `NotificacoesService.despachar()` — método `deveNotificarResponsavel()` |
| RN-06 | Infrequência crítica (> 25% faltas) de menor → notificação ao Conselho Tutelar | `OcorrenciasService.criar()` — verificar categoria + segmento |
| RN-07 | Professor não registra ocorrência de aluno de outra turma | `OcorrenciasService.criar()` — verificar escopo antes de persistir |
| RN-08 | Coordenador não valida ocorrência que ele mesmo registrou | `ValidacoesService.validar()` — comparar `registrador.id` vs `currentUser.id` |
| RN-09 | Ocorrências de Saúde/Bem-estar com risco à integridade: acesso restrito | `OcorrenciasService.buscar()` — filtrar por categoria + perfil do usuário |
| RN-10 | Dados de menores não exportados sem ciência formal do responsável | `RelatoriosService.exportar()` — verificar `cienciaFormalStatus` antes de incluir |
| RN-11 | Data de ocorrência retroativa > 90 dias exige aprovação do Diretor | `CreateOcorrenciaDto` (custom validator `@IsNotRetroalem90Dias`) + `OcorrenciasService` |
| RN-12 | Ocorrência arquivada é read-only (exceto notas de compliance) | `OcorrenciasService.atualizar()` — lançar `ForbiddenException` se status = ARQUIVADA |
| RN-13 | Aluno Superior tem direito de adicionar contrarrazões após validação | `ComentariosService.criar()` — verificar segmento do aluno + status da ocorrência |
| RN-14 | Plágio/fraude no Superior → instauração de Comissão Disciplinar em ≤ 10 dias úteis | `EncaminhamentosService.criar()` — detectar categoria + enfileirar `ComissaoDisciplinarJob` |

---

## 8. Taxonomia de Ocorrências e SLA

### Severidade e SLA de Resposta

| Nível | Descrição | SLA Validação | Ações Obrigatórias |
|---|---|---|---|
| 1 — Informativa | Registro histórico | 5 dias úteis | Nenhuma |
| 2 — Leve | Acompanhamento pedagógico | 3 dias úteis | Comentário do coordenador |
| 3 — Moderada | Ação formal + notificação | 2 dias úteis | Notif. responsável + encaminhamento |
| 4 — Grave | Impacto disciplinar | 24 horas | Validação coord. + notif. responsável |
| 5 — Gravíssima | Risco à integridade | 4 horas | Validação diretoria + notif. imediata + acionamento externo |

### Monitoramento de SLA
- Alerta em 75% do prazo → notificação in-app ao responsável pelo workflow
- Alerta em 100% (vencimento) → escalonamento automático + registro em auditoria
- `SlaMonitorTask` roda a cada 15 minutos via `@Cron` do `@nestjs/schedule`

### Categorias e Subcategorias Principais

| Categoria | Subcategoria | Notif. Responsável | Conselho Tutelar |
|---|---|---|---|
| Disciplinar | Agressão física | Todos | Não |
| Disciplinar | Bullying/Cyberbullying | Todos | Não |
| Disciplinar | Porte de objeto perigoso | Todos | **Sim (ECA art. 13)** |
| Acadêmica | Plágio/Desonestidade | Médio: sim | Não |
| Acadêmica | Infrequência crítica (>25%) | Fund./Médio | **Sim (ECA art. 56)** |
| Saúde/Bem-estar | Suspeita de violência doméstica | — | **Urgente** |
| Saúde/Bem-estar | Automutilação / risco | Todos | Não |

---

## 9. Common Hurdles — Problemas Conhecidos e Soluções

> Esta seção é a mais valiosa do documento. Cada item aqui representa horas de
> depuração já feitas. Nunca repita um problema resolvido.

### H-01: Claims SSO do Azure AD têm nomes customizados
**Problema:** O `passport-azure-ad` retorna no payload claims customizados como
`extension_perfil_sgoa` e `extension_campus_code`. O nome exato varia por tenant
e não está documentado de forma consistente.

**Solução:** Centralizar mapeamento em `auth/strategies/azure-ad.strategy.ts`
usando variáveis de ambiente. Nunca acessar claims diretamente no Controller.

```typescript
// src/modules/auth/strategies/azure-ad.strategy.ts
@Injectable()
export class AzureAdStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  async validate(profile: any): Promise<AuthenticatedUser> {
    const claims = profile._json;
    return {
      nome:     claims['name'],
      email:    claims['upn'] || claims['email'],
      perfil:   claims[process.env.SSO_CLAIM_PERFIL  ?? 'extension_perfil_sgoa'],
      campus:   claims[process.env.SSO_CLAIM_CAMPUS  ?? 'extension_campus_code'],
      segmento: claims[process.env.SSO_CLAIM_SEGMENTO ?? 'extension_segmento'],
    };
  }
}
```

### H-02: Validação de tipo de arquivo via magic bytes, não extensão
**Problema:** Upload de arquivo `.jpg` com conteúdo PHP passa validação de extensão
e pode ser executado se servido estaticamente.

**Solução:** `UploadService` usa o pacote `file-type` (npm) para detectar MIME
real via magic bytes antes de qualquer processamento ou envio ao S3.

```typescript
// src/modules/evidencias/upload.service.ts
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'application/pdf',
                       'video/mp4', 'application/vnd.openxmlformats-officedocument...'];

async validateMimeType(buffer: Buffer): Promise<void> {
  const type = await fileTypeFromBuffer(buffer);
  if (!type || !ALLOWED_MIMES.includes(type.mime)) {
    throw new BadRequestException(`Tipo de arquivo não permitido: ${type?.mime ?? 'desconhecido'}`);
  }
}
```

### H-03: Coordenador não pode validar sua própria ocorrência (RN-08)
**Problema:** `RolesGuard` checa apenas o perfil (`@Roles(PerfilUsuario.COORDENADOR)`),
mas não verifica identidade do registrador vs. validador.

**Solução:** A verificação de identidade fica no `ValidacoesService`, não no Guard.
Guards são para perfil; Services são para regras de negócio contextuais.

```typescript
// src/modules/validacoes/validacoes.service.ts
async validar(ocorrenciaId: string, dto: ValidarOcorrenciaDto, validador: Usuario) {
  const ocorrencia = await this.ocorrenciaRepository.findOneOrFail({
    where: { id: ocorrenciaId },
    relations: ['registrador'],
  });

  if (ocorrencia.registrador.id === validador.id) {
    throw new ForbiddenException(
      'RN-08: Coordenador não pode validar ocorrência que ele mesmo registrou.'
    );
  }
  // ... continua
}
```

### H-04: Auditoria append-only pode ser burlada pelo TypeORM
**Problema:** `queryRunner.query()` e `.save()` direto contornam o `AuditInterceptor`.
A imutabilidade precisa ser enforçada no banco, não só na aplicação.

**Solução:** Triggers MySQL diretamente na migration. Diferente do PostgreSQL (que
usa `RULE`), no MySQL usamos `BEFORE UPDATE` e `BEFORE DELETE` com `SIGNAL`.

```sql
-- src/database/migrations/XXXXXX-audit-triggers.ts (executar via queryRunner)
DELIMITER //
CREATE TRIGGER trg_prevent_audit_update
  BEFORE UPDATE ON auditorias
  FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Atualizações na tabela auditorias não são permitidas (append-only)';
END//

CREATE TRIGGER trg_prevent_audit_delete
  BEFORE DELETE ON auditorias
  FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Exclusões na tabela auditorias não são permitidas (append-only)';
END//
DELIMITER ;
```

### H-05: Notificação a responsável ANTES da validação em Sev. ≥ 4
**Problema:** Se o `OcorrenciasService.criar()` despacha notificações
imediatamente via evento, responsáveis são notificados antes da validação,
violando RF-04.

**Solução:** `NotificacoesService` verifica severidade + status antes de despachar.

```typescript
// src/modules/notificacoes/notificacoes.service.ts
deveNotificarResponsavel(ocorrencia: Ocorrencia): boolean {
  // Sev >= 4: só notifica após validação (status != AGUARDANDO_VALIDACAO)
  if (ocorrencia.severidade >= 4 &&
      ocorrencia.status === StatusOcorrencia.AGUARDANDO_VALIDACAO) {
    return false;
  }
  const menor = this.calcularIdade(ocorrencia.aluno.dataNascimento) < 18;
  return menor && ocorrencia.severidade >= 3;
}
```

### H-06: Datas retroativas > 90 dias contornam validação do frontend via API direta
**Problema:** Validação de datas no React pode ser contornada com chamada direta
à API NestJS. Toda regra de negócio precisa viver no backend.

**Solução:** Custom validator no DTO com `class-validator`:

```typescript
// src/common/validators/not-retro-alem-90-dias.validator.ts
@ValidatorConstraint({ name: 'notRetroAlem90Dias', async: false })
export class NotRetroAlem90DiasConstraint implements ValidatorConstraintInterface {
  validate(dataIncidente: string, args: ValidationArguments) {
    const dto = args.object as CreateOcorrenciaDto;
    if (dto.aprovacaoRetroativaDoiretor) return true;  // exceção RN-11
    const limite = subDays(new Date(), 90);
    return parseISO(dataIncidente) >= limite;
  }
  defaultMessage() {
    return 'Data retroativa > 90 dias exige aprovação do Diretor (RN-11)';
  }
}

// uso no DTO:
@IsDateString()
@Validate(NotRetroAlem90DiasConstraint)
dataIncidente: string;
```

### H-07: Token de ciência formal deve ser single-use e expirar
**Problema:** Token JWT simples pode ser reutilizado mesmo após confirmação,
e não há forma de invalidá-lo antes do vencimento.

**Solução:** Token é um hash SHA-256 de um UUID aleatório, armazenado em
`ciencias_formais.token_hash`. Após uso, `data_confirmacao` é preenchida —
qualquer request subsequente com o mesmo token é rejeitado.

```typescript
// src/modules/ciencia-formal/ciencia-formal.service.ts
async confirmar(token: string, ip: string, userAgent: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const ciencia = await this.cienciaRepository.findOne({ where: { tokenHash } });

  if (!ciencia) throw new NotFoundException('Token inválido');
  if (ciencia.dataConfirmacao) throw new BadRequestException('Token já utilizado');
  if (isAfter(new Date(), addBusinessDays(ciencia.dataEnvio, 5)))
    throw new BadRequestException('Token expirado');

  ciencia.dataConfirmacao = new Date();
  ciencia.ipConfirmacao = ip;
  ciencia.userAgent = userAgent;
  await this.cienciaRepository.save(ciencia);
}
```

### H-08: Escopo de dados deve considerar segmento, campus E perfil juntos
**Problema:** Um `RolesGuard` libera o endpoint para o perfil COORDENADOR, mas
não impede que um coordenador do campus A veja ocorrências do campus B.

**Solução:** Scoping de dados fica no Service (nunca no Controller ou Guard).
Cada método de listagem aplica o escopo do usuário autenticado.

```typescript
// src/modules/ocorrencias/ocorrencias.service.ts
async listar(filtros: FilterOcorrenciaDto, usuario: Usuario): Promise<Ocorrencia[]> {
  const query = this.ocorrenciaRepository.createQueryBuilder('oc')
    .leftJoinAndSelect('oc.aluno', 'aluno');

  switch (usuario.perfil) {
    case PerfilUsuario.PROFESSOR:
      query.where('oc.registradorId = :uid', { uid: usuario.id });
      break;
    case PerfilUsuario.COORDENADOR:
      query.where('aluno.campus = :campus', { campus: usuario.campus });
      break;
    case PerfilUsuario.ADMIN:
      break; // sem restrição
    default:
      throw new ForbiddenException('Perfil sem acesso a listagem de ocorrências');
  }
  return query.getMany();
}
```

### H-09: Entidades do TypeORM expostas diretamente na resposta HTTP
**Problema:** Retornar `Ocorrencia` diretamente do controller expõe campos
sensíveis (`cpfEncriptado`) e campos de sigilo clínico da equipe psicopedagógica.

**Solução:** Nunca retornar Entity diretamente. Sempre mapear para um `ResponseDto`
usando o `SerializeInterceptor` global + `@Expose()` / `@Exclude()` do `class-transformer`.

```typescript
// src/modules/ocorrencias/dto/ocorrencia-response.dto.ts
@Exclude()
export class OcorrenciaResponseDto {
  @Expose() id: string;
  @Expose() codigo: string;
  @Expose() severidade: number;
  @Expose() status: StatusOcorrencia;
  // campos clínicos: @Expose() somente se o interceptor verificar o perfil
}
```

### H-10: SLA em horas corridas vs. dias úteis — cálculo errado em feriados
**Problema:** Sev. 5 tem SLA de 4 horas corridas; Sev. 2 tem 3 dias úteis.
Usar `addDays()` do `date-fns` para dias úteis é errado — não desconta feriados.

**Solução:** Usar `date-fns-business-days` com feriados nacionais configurados.
Para horas corridas (Sev. 4 e 5) usar `addHours()` do `date-fns` puro.

```typescript
// src/modules/sla/sla.service.ts
calcularPrazo(criadoEm: Date, severidade: number): Date {
  if (severidade === 5) return addHours(criadoEm, 4);
  if (severidade === 4) return addHours(criadoEm, 24);
  if (severidade === 3) return addBusinessDays(criadoEm, 2);
  if (severidade === 2) return addBusinessDays(criadoEm, 3);
  return addBusinessDays(criadoEm, 5);
}
```

### H-11: Upload de arquivos grandes pode congestionar a API NestJS
**Problema:** Upload síncrono de arquivos grandes (até 50 MB) bloqueará o loop
de eventos do Node.js se feito via multipart direto para o NestJS.

**Solução:** S3 Pre-signed Upload URL. O frontend obtém a URL da API e envia o
arquivo diretamente ao S3, sem passar pelo NestJS. Apenas o `key` do S3 trafega
pela API após o upload.

```typescript
@Post('presigned-url')
async gerarPresignedUrl(@Body() dto: PresignedUrlDto) {
  return this.uploadService.gerarPresignedUploadUrl(dto.nomeArquivo, dto.mimeType);
}
@Post('confirmar')
async confirmarUpload(@Body() dto: ConfirmarUploadDto) {
  return this.uploadService.confirmarEValidar(dto.s3Key, dto.ocorrenciaId);
}
```

### H-12: Relatórios com dados de menores sem ciência formal do responsável
**Problema:** O `RelatoriosService` não verifica o status de ciência formal antes
de incluir dados sensíveis de menores na exportação.

**Solução:** Verificação explícita em `RelatoriosService.exportar()`. Dados de
menores são pseudonimizados por padrão em relatórios analíticos (LGPD art. 13).

```typescript
async exportarProntuario(alunoId: string, solicitante: Usuario): Promise<Buffer> {
  const aluno = await this.alunoRepository.findOneOrFail({ where: { id: alunoId } });
  const menor = this.calcularIdade(aluno.dataNascimento) < 18;
  if (menor && solicitante.perfil !== PerfilUsuario.ADMIN) {
    const ok = await this.cienciaRepository.exists({
      where: { ocorrencia: { aluno: { id: alunoId } }, dataConfirmacao: Not(IsNull()) }
    });
    if (!ok) throw new ForbiddenException('RN-10: Exportação exige ciência formal do responsável');
  }
}
```

### H-13: Race condition na geração do código único da Ocorrência
**Problema:** `gerarCodigo()` faz `COUNT(*) + 1`. Dois requests simultâneos recebem
o mesmo count e tentam persistir o mesmo código. A coluna `codigo` tem `UNIQUE` —
o segundo request falha com erro MySQL 1062, lançando HTTP 500 genérico.

**Solução:** Tabela de sequência com `UPDATE` atômico + `ON DUPLICATE KEY UPDATE`.

```sql
-- migration: criar tabela de sequência antes da tabela ocorrencias
CREATE TABLE codigo_sequencia (
  ano      INT         NOT NULL,
  segmento VARCHAR(2)  NOT NULL,
  ultimo_seq INT       NOT NULL DEFAULT 0,
  PRIMARY KEY (ano, segmento)
);
```

```typescript
// src/modules/ocorrencias/ocorrencias.service.ts
async gerarCodigo(segmento: Segmento): Promise<string> {
  const prefixo = { FUNDAMENTAL: 'FM', MEDIO: 'ME', SUPERIOR: 'SU' };
  const ano = new Date().getFullYear();
  const sig = prefixo[segmento];

  // UPDATE atômico — thread-safe sem lock de aplicação
  await this.dataSource.query(
    `INSERT INTO codigo_sequencia (ano, segmento, ultimo_seq) VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE ultimo_seq = ultimo_seq + 1`,
    [ano, sig]
  );
  const [{ ultimo_seq }] = await this.dataSource.query(
    `SELECT ultimo_seq FROM codigo_sequencia WHERE ano = ? AND segmento = ?`,
    [ano, sig]
  );
  return `OC-${ano}-${String(ultimo_seq).padStart(5, '0')}-${sig}`;
}
```
> Substitui a implementação em §5.4. `dataSource` é injetado via
> `@InjectDataSource()` no construtor do `OcorrenciasService`.


### H-14: CORS bloqueando frontend + headers de segurança ausentes
**Problema:** Sem configuração de CORS, o Next.js não consegue chamar a API NestJS
em desenvolvimento (`http://localhost:3000` → `http://localhost:3001`). Sem Helmet,
headers de segurança (CSP, X-Frame-Options, etc.) ficam ausentes.

**Solução:** Configurar em `main.ts` antes de `app.listen()`.

```typescript
// src/main.ts
import helmet from 'helmet';
import { ThrottlerModule } from '@nestjs/throttler';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());                          // headers de segurança HTTP
  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,                        // necessário para cookies de sessão SSO
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // ... guards, interceptors, filtros globais
  await app.listen(process.env.PORT ?? 3001);
}
```

```typescript
// AppModule — rate limiting global (100 req/min por IP)
@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // ...
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
```
> `FRONTEND_URL` deve ser adicionado ao `.env` e ao §3.

### H-15: N+1 queries no TypeORM — armadilha silenciosa
**Problema:** TypeORM não faz eager loading por padrão. Acessar `ocorrencia.aluno`
sem declarar `relations` dispara uma query extra por ocorrência — invisível no código,
devastador em listas de 100+ registros.

**Solução:** Sempre declarar `relations` explicitamente. Para queries complexas,
usar `QueryBuilder` com joins manuais.

```typescript
// ❌ ERRADO — N+1: 1 query lista + N queries aluno
const ocorrencias = await this.ocorrenciaRepository.find();
ocorrencias.forEach(oc => console.log(oc.aluno.nome)); // query extra por item

// ✅ CORRETO — 1 query com JOIN
const ocorrencias = await this.ocorrenciaRepository.find({
  relations: ['aluno', 'categoria', 'registrador'],
  where: { status: StatusOcorrencia.ABERTA },
});

// ✅ CORRETO — QueryBuilder para filtros compostos
const ocorrencias = await this.ocorrenciaRepository
  .createQueryBuilder('oc')
  .leftJoinAndSelect('oc.aluno', 'aluno')
  .leftJoinAndSelect('oc.categoria', 'cat')
  .where('aluno.campus = :campus AND oc.status != :status',
         { campus: usuario.campus, status: StatusOcorrencia.ARQUIVADA })
  .orderBy('oc.criadoEm', 'DESC')
  .skip((page - 1) * pageSize)
  .take(pageSize)
  .getManyAndCount();   // retorna [items, total] — use para PaginatedResponseDto
```
> Regra: toda listagem paginada usa `.getManyAndCount()` do QueryBuilder.
> Nunca `find()` + contagem separada (duas queries quando uma resolve).


### H-16: Graceful shutdown — tasks @nestjs/schedule interrompidas no deploy
**Problema:** Sem graceful shutdown, um `SIGTERM` (deploy, restart de container)
mata o processo enquanto uma tarefa agendada está em execução, deixando
notificações ou escalamentos de SLA em estado inconsistente.

**Solução:** Habilitar `enableShutdownHooks()` no NestJS. O `@nestjs/schedule`
aguarda os cron jobs ativos finalizarem antes de encerrar o processo.

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();   // captura SIGTERM/SIGINT — aguarda @Cron em execução
  // ... restante da configuração
  await app.listen(process.env.PORT ?? 3001);
}
```

```typescript
// src/modules/sla/tasks/sla-monitor.task.ts
@Injectable()
export class SlaMonitorTask {
  @Cron('*/15 * * * *')   // a cada 15 min
  async verificarPrazos(): Promise<void> {
    // @nestjs/schedule aguarda este método completar antes de encerrar o processo
  }
}
```
> Sem isso, deploys frequentes em produção causam perda silenciosa de
> notificações obrigatórias (RN-05), que são infrações legais no SGOA.


### H-17: TypeORM `DataTypeNotSupportedError: Data type "Object"` em colunas nullable
**Problema:** Com `strictPropertyInitialization: false` no `tsconfig.json`, o TypeScript
não emite metadados de tipo corretos para propriedades com tipos union (`string | null`,
`Date | null`). O TypeORM recebe `Object` como tipo e lança `DataTypeNotSupportedError`
ao tentar criar o datasource MySQL.

**Solução:** Sempre declarar `type:` explicitamente em todo `@Column()` que tem
`nullable: true`. Não confiar na inferência automática do TypeORM para tipos nullable.

```typescript
// ❌ ERRADO — TypeORM infere 'Object' para string | null sem strict
@Column({ name: 'ocorrencia_id', nullable: true })
ocorrenciaId: string | null;

// ✅ CORRETO — type explícito obrigatório
@Column({ name: 'ocorrencia_id', type: 'varchar', length: 36, nullable: true })
ocorrenciaId: string | null;

@Column({ name: 'data_confirmacao', type: 'datetime', nullable: true })
dataConfirmacao: Date | null;
```

**Regra:** em qualquer entity, todo campo com `nullable: true` deve ter `type:` declarado.
Grep de verificação: `grep -r "nullable: true" src/modules --include="*.entity.ts"` — qualquer
linha sem `type:` na mesma expressão é candidata ao bug.

### H-18: MySQL triggers exigem `log_bin_trust_function_creators=1` sem SUPER privilege
**Problema:** O usuário da aplicação (`sgoa_user`) não tem privilégio SUPER. Com binary
logging habilitado (padrão no MySQL 8 do Docker), criar TRIGGER lança:
`ER_BINLOG_CREATE_ROUTINE_NEED_SUPER`.

**Solução:** Adicionar `--log_bin_trust_function_creators=1` ao comando do serviço MySQL
no `docker-compose.yml`. Isso permite criação de triggers por usuários não-SUPER.

```yaml
# docker-compose.yml
db:
  image: mysql:8.0
  command: --log_bin_trust_function_creators=1
  # ...
```

> Em produção gerenciada (RDS, Cloud SQL), setar a variável via parâmetro do grupo
> de configuração, não via linha de comando.

### H-19: `docker compose up --force-recreate <serviço>` também recria serviços dependentes
**Problema:** Executar `docker compose up -d --force-recreate backend` recria também o
serviço `db` (declarado em `depends_on`), o que pode reiniciar o banco e perder configurações
de sessão (ex: `SET GLOBAL` temporários).

**Solução 1:** Usar `docker compose restart backend` se a imagem já foi reconstruída e
o contêiner só precisa ser reiniciado.
**Solução 2:** Persistir configurações no `docker-compose.yml` via `command:` em vez de
`SET GLOBAL` temporário (ver H-18).

### H-21: `@InjectDataSource()` usa token específico nos testes — não usar string `'DataSource'`
**Problema:** `@InjectDataSource()` do TypeORM NestJS não usa a string `'DataSource'` como token.
Ao mockar o `DataSource` em testes unitários com `{ provide: 'DataSource', useValue: mock }`,
o NestJS lança `Can't resolve dependencies... argument DataSource at index [1] is not available`.

**Solução:** Usar `getDataSourceToken()` importado de `@nestjs/typeorm`:

```typescript
import { getDataSourceToken } from '@nestjs/typeorm';

{ provide: getDataSourceToken(), useValue: { query: jest.fn() } }
```

### H-22: Mock de repositório TypeORM com filtros de `where` — não testar o filtro no mock
**Problema:** Quando o service faz `repo.findOne({ where: { email, ativo: true } })`,
o mock retorna o valor configurado **independentemente** do argumento passado.
Se o mock retornar um usuário com `ativo: false`, o serviço ainda o recebe e
não lança NotFoundException — pois a filtragem acontece no banco, não no código.

**Solução:** Simular o comportamento do banco no mock: retornar `null` para representar
"nenhum registro encontrou essa condição" — não retornar o objeto com o campo incorreto.

```typescript
// ❌ ERRADO — mock retorna user, service não lança exceção
usuarioRepo.findOne.mockResolvedValue(makeUsuario({ ativo: false }));

// ✅ CORRETO — null simula "WHERE ativo=true não encontrou nada"
usuarioRepo.findOne.mockResolvedValue(null);
```

### H-23: `@Throttle({ default: {...} })` sobrescreve o limite global mesmo em testes E2E
**Problema:** O endpoint `POST /auth/magic-link` tem `@Throttle({ default: { ttl: 60_000, limit: 3 } })`.
Mesmo que o `ThrottlerModule.forRoot` configure um limite alto no app de teste, o decorator
sobrescreve para 3 — causando HTTP 429 nos testes que chamam o endpoint múltiplas vezes.

**Solução:** Substituir o `ThrottlerGuard` por um guard no-op no app de teste.
Rate limit é comportamento de infraestrutura, não de negócio — testar nos unit tests se necessário.

```typescript
// test/helpers/create-test-app.ts
@Injectable()
class NoopThrottleGuard implements CanActivate {
  canActivate() { return true; }
}

// no TestingModule:
{ provide: APP_GUARD, useClass: NoopThrottleGuard },  // não registrar ThrottlerGuard
```

### H-24: `codigo_sequencia` não é entity TypeORM — `synchronize: true` não a cria
**Problema:** A tabela `codigo_sequencia` é criada por migration SQL pura (INSERT atômico).
Com `synchronize: true` no banco de teste, o TypeORM cria apenas as entidades declaradas.
O método `gerarCodigo()` falha com erro de "table doesn't exist" durante os testes E2E.

**Solução:** Criar a tabela no `globalSetup` antes dos testes, e truncá-la junto com as demais
tabelas entre execuções:

```typescript
// test/helpers/global-setup.ts
await ds.query(`
  CREATE TABLE IF NOT EXISTS codigo_sequencia (
    ano      INT        NOT NULL,
    segmento VARCHAR(2) NOT NULL,
    ultimo_seq INT      NOT NULL DEFAULT 0,
    PRIMARY KEY (ano, segmento)
  )
`);
```

### H-25: Entity, migration e seed podem divergir silenciosamente
**Problema:** O TypeORM carrega todas as `*.entity.ts` pelo glob de configuração, mas
as migrations e seeds são SQL/manual. Se um modelo evolui (ex: `responsaveis_legais`
vira `responsaveis` + `aluno_responsavel`) e a entity antiga continua no diretório,
os testes com `synchronize: true` podem mascarar a divergência enquanto um banco criado
por migration quebra em runtime.

**Solução:** Ao mudar modelo de dados, atualizar os três pontos na mesma alteração:
1. Entity ativa em `src/modules/**/entities`
2. Migration que cria o schema
3. Seed e `test/helpers/global-setup.ts`

Remover entities obsoletas em vez de deixá-las "sem uso"; o glob do TypeORM ainda as
considera metadados válidos.

### H-26: Seeds idempotentes precisam atualizar escopos novos
**Problema:** `findOrCreate()` em seeds de teste retorna o registro existente sem aplicar
campos adicionados depois. Ao introduzir `turmas` e `usuario_turmas`, alunos E2E antigos
continuavam com `turma_id = NULL`, fazendo a RN-07 bloquear professor com 403 mesmo com a
turma criada.

**Solução:** Quando um campo novo vira requisito de escopo/autorização, o seed deve ser
autocorretivo: depois do `findOrCreate()`, comparar o campo crítico e executar `update`
se estiver divergente. Também criar os vínculos de permissão antes dos testes que passam
por guards/regras de negócio.

```typescript
// Exemplo: seed idempotente com autocorreção de turma_id
const aluno = await alunoRepo.findOne({ where: { matricula } })
  ?? await alunoRepo.save(alunoRepo.create({ matricula, turmaId, ... }));
if (aluno.turmaId !== turmaId) {
  await alunoRepo.update(aluno.id, { turmaId });
}
```

### H-20: `DB_PORT` no `.env` é a porta do host; dentro do Docker é sempre 3306
**Problema:** O `.env` define `DB_PORT=3307` (porta mapeada no host para evitar conflito com
MySQL local). Dentro da rede Docker, o backend deve conectar em `db:3306`. Se o backend
dentro do Docker usar `DB_PORT=3307`, a conexão falha com `ECONNREFUSED`.

**Solução:** Sobrescrever `DB_PORT` no `docker-compose.yml` para o serviço backend:

```yaml
backend:
  env_file: .env          # carrega DB_PORT=3307 do .env
  environment:
    DB_HOST: db            # sobrescreve para o hostname Docker interno
    DB_PORT: 3306          # sobrescreve para a porta interna do container MySQL
```

> O `.env` continua com `DB_PORT=3307` para desenvolvimento local (`npm run start:dev`
> fora do Docker), e o `docker-compose.yml` sobrescreve apenas para o container.


---

## 10. Design Patterns do Projeto

> Siga estes padrões consistentemente. O agente não deve introduzir novos
> padrões sem discutir com o Navigator humano.

### P-01: Controllers são finos — lógica vive nos Services
Controller recebe HTTP, valida DTO via `ValidationPipe`, chama um método do
Service, retorna o resultado. Nada mais.

```typescript
// ✅ CORRETO
@Post()
@Roles(PerfilUsuario.PROFESSOR, PerfilUsuario.COORDENADOR)
async criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() user: Usuario) {
  return this.ocorrenciasService.criar(dto, user);
}
// ❌ ERRADO — lógica de negócio no controller
@Post()
async criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() user: Usuario) {
  if (user.perfil !== 'PROFESSOR') throw new ForbiddenException();
  const aluno = await this.alunosRepo.findOne(...); // 30 linhas de lógica
}
```

### P-02: AuditInterceptor registra automaticamente operações sensíveis
Interceptor NestJS global via `APP_INTERCEPTOR`. Nunca registrar auditoria
manualmente dentro do Service.

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(() => {
        const req = context.switchToHttp().getRequest();
        this.auditoriaService.registrar({ ator: req.user, /* ... */ });
      })
    );
  }
}
```

### P-03: Machine de estados para o ciclo de vida da Ocorrência
Transições inválidas lançam `BadRequestException`. Nunca alterar status em `update()` genérico.

```typescript
private readonly TRANSICOES_VALIDAS = {
  ABERTA:               ['AGUARDANDO_VALIDACAO', 'EM_ACOMPANHAMENTO'],
  AGUARDANDO_VALIDACAO: ['EM_ACOMPANHAMENTO', 'REVISAO'],
  EM_ACOMPANHAMENTO:    ['RESOLVIDA'],
  RESOLVIDA:            ['ARQUIVADA', 'EM_ACOMPANHAMENTO'],
  ARQUIVADA:            [],
  REVISAO:              ['ABERTA'],
};
```

### P-04: Componentes React reutilizáveis para UI padronizada
`SeveridadeBadge`, `OcorrenciaCard` e `SlaIndicator` em `components/ocorrencias/`.
Nunca duplicar lógica de cores de severidade em múltiplos lugares.

### P-05: @nestjs/schedule para operações assíncronas recorrentes
**Nunca** enviar e-mail ou processar escalamentos de SLA de forma síncrona no fluxo da request.
Usar tarefas agendadas (`@Cron`) ou fire-and-forget via `setImmediate` para operações que não
precisam de resposta imediata.

```typescript
// ✅ CORRETO — notificações despachadas de forma não bloqueante
this.notificacoesService.despacharAsync(ocorrencia);   // fire-and-forget
// ✅ CORRETO — SLA monitorado por tarefa agendada independente da request
@Cron('*/15 * * * *') async verificarPrazos() { ... }
// ❌ ERRADO — bloqueia a request aguardando envio de e-mail
await this.emailService.enviar(destinatario, template);
```

### P-06: Testes incluem asserção negativa de RBAC obrigatória
Todo endpoint com `@Roles()` deve ter ao menos um teste verificando que o perfil
não-autorizado recebe 403. Ver Seção 19.2 para templates completos.

### P-07: Notificações legais não podem ser desabilitadas pelo usuário
Flag `obrigatorioLegal: true` na `CategoriaOcorrencia` bloqueia opt-out no
`NotificacoesService`.

### P-08: Formulários adaptativos por segmento via estado React
Lógica de campos obrigatórios por segmento em objeto de configuração TypeScript,
não como condicional espalhada no JSX.

```typescript
export const CAMPOS_SEGMENTO: Record<Segmento, CampoConfig[]> = {
  FUNDAMENTAL: [{ nome: 'notifResponsavel', obrigatorio: true }],
  MEDIO:       [{ nome: 'processoDisicplinar', obrigatorio: false }],
  SUPERIOR:    [{ nome: 'processoDisicplinar', obrigatorio: true },
                { nome: 'contrarrazoes', obrigatorio: false }],
};
```

### P-09: Escopo de dados sempre via Service — ver H-08 para implementação completa
O Controller nunca aplica filtros de escopo; sempre delega ao Service com o
usuário autenticado como parâmetro. Solução detalhada em H-08.

### P-10: Campos CPF sempre criptografados, nunca logados
AES-256-GCM via `CryptoService`. Configurar `logger.redact` para mascarar `cpf`,
`token`, `password`. Coluna com `select: false` no TypeORM.

### P-11: Simplicidade é a meta — padrões são o meio
Os padrões deste documento existem para resolver problemas reais do SGOA, não para
demonstrar sofisticação técnica. Antes de criar uma abstração, uma interface, um
evento de domínio ou uma task agendada com `@Cron`, perguntar:

```
[ ] Qual problema concreto isso resolve?
[ ] A solução mais simples (uma função, um método direto) já seria suficiente?
[ ] Quem vai ler e manter isso em 6 meses vai entender sem explicação?
```

```typescript
// ❌ OVER-ENGINEERING — abstração sem problema real
class OcorrenciaStatusTransitionStrategyFactory {
  createStrategy(status: StatusOcorrencia): IStatusTransitionStrategy { ... }
}

// ✅ SIMPLES E SUFICIENTE — o problema é uma validação, a solução é uma função
function validarTransicao(atual: StatusOcorrencia, novo: StatusOcorrencia): void {
  if (!TRANSICOES_VALIDAS[atual].includes(novo)) {
    throw new BadRequestException(`Transição inválida: ${atual} → ${novo}`);
  }
}
```

**Regra prática:** se precisar de mais de uma frase para explicar por que uma
abstração existe, ela provavelmente não deveria existir ainda. Crie quando o
problema aparecer, não antes.

---

## 11. RBAC — Matriz de Permissões Rápida

| Capacidade | Prof. | Coord. | Eq.Ped. | Diretor | Secret. | Admin | Aluno | Resp. |
|---|---|---|---|---|---|---|---|---|
| Registrar ocorrência | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Ver ocorrências (escopo próprio) | Parcial | ✓ | ✓ | ✓ | — | ✓ | Parcial | Parcial |
| Validar ocorrência grave | — | ✓ | — | ✓ | — | — | — | — |
| Encaminhar/criar ação | — | ✓ | ✓ | ✓ | — | — | — | — |
| Comentar em ocorrência | ✓ | ✓ | ✓ | ✓ | — | ✓ | Parcial | ✓ |
| Arquivar ocorrência | — | ✓ | — | ✓ | — | ✓ | — | — |
| Dashboard estratégico | — | Parcial | — | ✓ | — | ✓ | — | — |
| Exportar relatórios | — | ✓ | — | ✓ | ✓ | ✓ | — | — |
| Gerir usuários/configs | — | — | — | — | — | ✓ | — | — |

**Parcial** = restrito ao próprio escopo (turmas do professor, filhos do responsável, etc.)

---

## 12. Diferenciação por Segmento — Resumo Executivo

| Comportamento | Fundamental | Médio | Superior |
|---|---|---|---|
| Notif. responsável obrigatória (Sev. ≥ 3) | **Sim** | **Sim** | Não |
| Protocolo Conselho Tutelar disponível | **Sim** | **Sim** | Não |
| Ciência formal do aluno | Não (via resp.) | Sim (> 16 anos) | **Sim** |
| Campo Processo Disciplinar | Não | Sim | Sim |
| Comissão Disciplinar (plágio/fraude) | Não | Não | **Sim (≤ 10 dias)** |
| Contrarrazões do aluno | Não | Não | **Sim (RN-13)** |

---

## 13. Conformidade Legal — Checklist por Feature

Antes de marcar qualquer feature como completa, verificar:

### Para qualquer ocorrência envolvendo menor de 18 anos:
- [ ] Responsável legal cadastrado no sistema?
- [ ] Notificação ao responsável acionada corretamente (RN-05)?
- [ ] Dados do menor não expostos sem ciência formal em exportações (RN-10)?
- [ ] Retenção configurada: até maioridade + 5 anos (ECA)?

### Para ocorrências com Conselho Tutelar (ECA art. 13 e 56):
- [ ] Protocolo de notificação gerado com número de registro?
- [ ] Campo de retorno do Conselho Tutelar disponível no encaminhamento?

### Para qualquer dado pessoal (LGPD):
- [ ] CPF armazenado criptografado?
- [ ] Log de auditoria registra quem acessou o dado?
- [ ] Mecanismo DSAR (direito do titular) disponível em até 15 dias úteis?
- [ ] Dados analíticos pseudonimizados quando identificação não é necessária?

### Para ocorrências gravíssimas (Sev. 5):
- [ ] SLA de 4 horas corridas monitorado?
- [ ] Escalonamento automático funcionando se SLA vencer?
- [ ] Diretoria notificada imediatamente?

---

## 14. Pipeline de CI — Obrigatório em Todo Commit

> Comandos completos em §19.6. Regra: nenhum commit vai para `main` com CI quebrado.
> Vulnerabilidade `high`/`critical` no `npm audit` é bloqueante.

---

## 15. Checklist Pós-Implementação de Feature

> Executar **antes** de abrir PR. Não é opcional.

```
[ ] Testes unitários escritos para a lógica de negócio principal (Service)
[ ] Teste negativo: perfil não-autorizado recebe 403, não 200
[ ] Teste de integração (Supertest) cobrindo o fluxo feliz completo
[ ] Registro em auditoria verificado para toda mudança de dado sensível
[ ] npm audit sem vulnerabilidades high/critical
[ ] ESLint sem erros (warnings documentados)
[ ] DTO de entrada validado com class-validator (todos os campos obrigatórios)
[ ] ResponseDto mapeado (Entity nunca exposta diretamente na resposta)
[ ] Regras de negócio relacionadas verificadas (consultar Seção 7)
[ ] Notificações testadas com perfil COORDENADOR e RESPONSAVEL_LEGAL
[ ] SLA monitorado se a feature altera severidade ou status de ocorrência
[ ] Conformidade legal verificada (consultar Seção 13)
[ ] Campos CPF/token não aparecem em logs (grep nos logs de teste)
[ ] CLAUDE.md atualizado se novo hurdle ou padrão foi descoberto
[ ] DOC_EDUCATIVO.md atualizado com a feature implementada (consultar Seção 18)
```

---

## 16. Filosofia de Trabalho com IA — Regras do Navigator

*(Baseado em Fabio Akita, "Do Zero à Pós-Produção em 1 Semana", 2026)*

- **Humano = Navigator (O QUÊ + POR QUÊ). IA = Driver (COMO).** Contexto de domínio legal (ECA, LGPD) não está em tutorial — é o Navigator que traz. A IA nunca diz "não": você é o code review.
- **Commit a cada feature pequena com CI verde.** Refatoração = commit separado. Arquivo > 200 linhas → extraia agora, não depois.
- **TDD é rede de segurança.** Sem testes, cada mudança da IA é aposta. Interrompa sobre-engenharia: se a IA propõe 10 serviços para algo que precisa de 3, simplifique.
- **Documente hurdles no CLAUDE.md e features no DOC_EDUCATIVO.md** antes de fechar a sessão. O próximo contexto começa do zero; este arquivo é a memória que persiste.

---

## 17. Glossário do Domínio

| Termo | Definição no contexto do SGOA |
|---|---|
| Ocorrência | Registro formal de evento envolvendo aluno (disciplinar, acadêmico, comportamental, saúde) |
| Severidade | Escala 1–5 de impacto da ocorrência; define SLA e fluxo de validação |
| Segmento | Nível de ensino: Fundamental, Médio ou Superior |
| Responsável Legal | Pai/mãe/tutor de aluno menor de 18 anos; tem direitos legais específicos |
| Ciência Formal | Confirmação rastreável (legal) de que aluno/responsável tomou conhecimento |
| SLA | Prazo máximo para validação/encaminhamento por severidade |
| RBAC | Role-Based Access Control — controle de acesso por perfil |
| ECA | Estatuto da Criança e do Adolescente — lei federal 8.069/1990 |
| LGPD | Lei Geral de Proteção de Dados — lei federal 13.709/2018 |
| DSAR | Data Subject Access Request — solicitação do titular de dados (LGPD art. 18) |
| Conselho Tutelar | Órgão municipal de proteção de direitos da criança e do adolescente |
| Comissão Disciplinar | Instância colegiada para casos graves no Ensino Superior |
| Prontuário | Conjunto completo de ocorrências e histórico de um aluno |
| Encaminhamento | Ação formal criada para resolver/acompanhar uma ocorrência validada |
| SSO | Single Sign-On — autenticação centralizada via provedor institucional |
| DTO | Data Transfer Object — objeto tipado que define e valida dados de entrada/saída |
| Guard | Mecanismo NestJS que verifica permissões antes de executar um endpoint |
| Interceptor | Mecanismo NestJS que intercepta requests/responses (ex: auditoria, serialização) |

---

## 18. Documento Educativo — Protocolo de Manutenção

> **Propósito:** Luciano será testado pelos stakeholders em todas as partes do
> sistema. O `DOC_EDUCATIVO.md` é um documento vivo que explica, em linguagem
> acessível, cada decisão técnica, lógica de negócio, estrutura de código e
> implementação realizada. É a ponte entre o que foi construído e a capacidade
> de Luciano de defender e explicar cada escolha.

### Arquivo a manter: `DOC_EDUCATIVO.md`

Vive na raiz do projeto, ao lado do `CLAUDE.md`. **O agente deve atualizar o
`DOC_EDUCATIVO.md` ao final de cada feature implementada**, antes de fechar a sessão.

### Quando atualizar

| Evento | O que documentar |
|---|---|
| Nova feature implementada | Como funciona, por que foi feita assim, quais RNs implementa |
| Decisão de arquitetura | Opção escolhida, alternativas descartadas, motivação |
| Hurdle resolvido | Problema, causa raiz, solução, aprendizado |
| Integração entre camadas | Como Controller → Service → Repository se comunicam |
| Regra legal (ECA/LGPD) | O que a lei exige, como o sistema atende, onde está no código |

### Template de módulo para o DOC_EDUCATIVO.md

```markdown
## Módulo: [Nome] — [Data da última atualização]

### O que este módulo faz
[2-3 frases sem jargão técnico]

### Por que foi construído assim
[Decisões de design: por que esse padrão, essa biblioteca, essa estrutura]

### Camadas e responsabilidades
- **Controller**: [O que recebe, valida e retorna]
- **Service**: [Quais regras de negócio implementa]
- **DTOs**: [Quais dados aceita e quais validações aplica]
- **Entity**: [Quais dados persiste, quais campos são sensíveis]
- **Repository**: [Quais queries customizadas existem e por quê]

### Regras de negócio implementadas
[RNs da ERS com explicação de COMO cada uma está no código]

### Fluxo principal (passo a passo)
[Request HTTP → Controller → Service → Repository → resposta]

### O que pode dar errado (e como o sistema trata)
[Casos de erro, validações, exceções, resposta ao frontend]

### Como explicar para um stakeholder não técnico
[Analogia do mundo real, sem termos de código]
```

### Regras de escrita

1. **Escrever para quem não sabe programar.** Use analogias do mundo real.
2. **Sempre responder "por quê", não só "o quê".** A motivação é o que Luciano
   precisará defender para os stakeholders.
3. **Referenciar o código real.** Citar arquivo e função exatos.
4. **Atualizar, nunca reescrever do zero.** O histórico cumulativo é valioso.
5. **Incluir perguntas que um stakeholder provavelmente fará** e suas respostas.

---

*Versão deste documento: 2.0 — Atualizado em Abril/2026*
*Stack: React/Next.js (frontend) + NestJS (backend) + MySQL*
*Arquitetura backend: Modules → Controllers → Services → DTOs → Entities/Repositories*
*Atualizar CLAUDE.md a cada hurdle novo descoberto durante o desenvolvimento.*
*Atualizar DOC_EDUCATIVO.md a cada feature implementada (ver Seção 18).*

---

## 19. Estratégia de Testes — Guia por Camada

> Esta seção define **o que testar, como nomear, como estruturar e quais
> asserções são obrigatórias** para cada tipo de teste no SGOA. Consultar
> antes de implementar qualquer feature nova.
>
> Regra geral: **cada feature entregue deve ter os três tipos de teste
> abaixo**. Não há exceção. Um Service sem teste unitário não está "pronto".

---

### 19.1 Testes Unitários (Jest — Backend)

**O que testar:** toda lógica de negócio que vive nos Services. Mockar o
Repository e qualquer dependência externa (NotificacoesService, SlaService, etc.).
O teste unitário **nunca acessa o banco de dados**.

**Localização:** `backend/src/modules/<modulo>/<modulo>.service.spec.ts`

**Convenção de nomenclatura:**

```
describe('NomeService', () => {
  describe('nomeDoMetodo()', () => {
    it('deve [comportamento esperado] quando [condição]', ...)
    it('deve lançar ForbiddenException quando [violação de RN]', ...)
  })
})
```

**Estrutura obrigatória (padrão para todo Service):**

```typescript
// Factories com overrides — nunca literais hardcoded nos testes
const makeUsuario = (o: any = {}) => ({ id: 'uuid-1', perfil: 'PROFESSOR', campus: 'Campus A', ...o });
const makeAluno   = (o: any = {}) => ({ id: 'uuid-2', status: 'ATIVO', segmento: 'FUNDAMENTAL',
                                        dataNascimento: new Date('2010-01-01'), ...o });

describe('OcorrenciasService', () => {
  // providers: Service + { provide: OcorrenciaRepository, useValue: { save: jest.fn(), ... } }
  //            + { provide: NotificacoesService, useValue: { despachar: jest.fn() } }

  describe('criar()', () => {
    it('deve [comportamento] quando [condição]', async () => { /* fluxo feliz */ });
    it('deve lançar ForbiddenException (RN-07) quando professor de outro campus', ...);
    it('deve disparar notificação ao responsável — aluno menor + sev ≥ 3 (RN-05)', ...);
    it('NÃO deve notificar responsável — aluno maior de idade (RN-05)', ...);
  });
  describe('alterarStatus()', () => {
    it('deve lançar BadRequestException — transição ARQUIVADA → ABERTA inválida', ...);
  });
});
```

**Cobertura mínima exigida por Service:**
- Fluxo feliz (happy path) de cada método público
- Cada regra de negócio (RN-XX) implementada no método
- Pelo menos um teste negativo por regra crítica (ForbiddenException, BadRequestException)
- Asserções sobre efeitos colaterais (notificações, auditoria, tarefas agendadas)

---

### 19.2 Testes de Integração (Supertest — Backend)

**O que testar:** o endpoint HTTP completo, com banco de dados real em memória
(SQLite in-memory via TypeORM) ou banco de teste isolado (MySQL de CI).
O `RolesGuard`, `ValidationPipe`, `AuditInterceptor` devem estar ativos.

**Localização:** `backend/test/<modulo>.e2e-spec.ts`

**Convenção:** um arquivo `.e2e-spec.ts` por módulo/feature.

**Estrutura obrigatória (padrão para todo módulo):**

```typescript
// backend/test/<modulo>.e2e-spec.ts
describe('Ocorrências — E2E', () => {
  // beforeAll: criar app + seed no banco sgoa_test + gerar tokens por perfil
  //   tokenProfessor   = gerarTokenJwt({ perfil: 'PROFESSOR',   campus: 'Campus A' });
  //   tokenOutroCampus = gerarTokenJwt({ perfil: 'COORDENADOR', campus: 'Campus B' });
  // afterAll: await app.close()

  it('POST /ocorrencias — professor próprio campus → 201 + codigo OC-XXXX-XXXXX-FM');
  it('POST /ocorrencias sem token → 401');
  it('POST /ocorrencias perfil sem permissão → 403');
  it('POST /ocorrencias severidade=6 → 400 com campo "severidade" na mensagem');
  it('RN-08: Coordenador NÃO valida própria ocorrência → 403');
  it('H-08: Coordenador Campus B NÃO vê ocorrências Campus A → lista vazia');
});
```

**Asserções obrigatórias em todo teste de integração:**
1. HTTP 2xx no fluxo feliz — verificar o body retornado
2. HTTP 401 sem token
3. HTTP 403 para perfil incorreto (asserção negativa de RBAC)
4. HTTP 400 para DTO inválido (campo faltante, fora do range, formato errado)
5. HTTP 4xx para cada RN crítica do endpoint

---

### 19.3 Testes E2E de Interface (Playwright — Frontend)

**O que testar:** fluxos críticos do ponto de vista do usuário real, interagindo
com o navegador. Não mockam a API — apontam para o ambiente de staging ou
para o backend de teste rodando localmente.

**Localização:** `frontend/e2e/<feature>.spec.ts`

**Convenção:** um arquivo `.spec.ts` por jornada de usuário crítica.

**Estrutura obrigatória (usar `data-testid` em todos os elementos interativos):**

```typescript
// frontend/e2e/<feature>.spec.ts
// beforeEach: loginComPerfil(page, 'PROFESSOR') via helper que usa SSO de teste

test('professor registra ocorrência e vê código OC-XXXX no toast de confirmação');
test('alerta de reincidência aparece ao salvar — aluno com ≥ 3 ocorrências em 30 dias');
test('campo "Processo Disciplinar" visível só para aluno SUPERIOR');
// Regra: cada test.describe = uma jornada de usuário; usar seed no banco de teste
```

**Fluxos críticos obrigatórios no Playwright:**

| Feature | Fluxo a cobrir |
|---|---|
| Auth | Login SSO → redirect → dashboard; logout limpa sessão |
| Ocorrências | Registro completo (Fundamental, Médio, Superior) |
| Ocorrências | Formulário adaptativo por segmento |
| Ocorrências | Alerta de reincidência aparece/não aparece |
| Validações | Coordenador valida; erro ao validar a própria |
| Ciência Formal | Responsável acessa link → confirma → link expira |
| SLA | Indicador de prazo aparece na lista (Sev. 4 e 5) |
| Dashboard | Diretor vê; coordenador vê escopo do campus; professor não vê |

---

### 19.4 Testes Unitários de Componentes React (Jest + RTL — Frontend)

**O que testar:** componentes de UI que contêm lógica (validação, estado,
formatação). **Não** testar componentes puramente visuais sem lógica.

**Localização:** `frontend/src/components/<area>/<Componente>.spec.tsx`

```typescript
// frontend/src/components/ocorrencias/SeveridadeBadge.spec.tsx
import { render, screen } from '@testing-library/react';
import { SeveridadeBadge } from './SeveridadeBadge';

describe('SeveridadeBadge', () => {
  it.each([
    [1, 'Informativa',  'bg-gray-100'],
    [3, 'Moderada',     'bg-yellow-100'],
    [5, 'Gravíssima',   'bg-red-700'],
  ])('severidade %i exibe label "%s" com classe "%s"', (sev, label, cls) => {
    const { container } = render(<SeveridadeBadge severidade={sev} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(cls);
  });
});
```

---

### 19.5 Convenções Gerais de Teste

| Item | Regra |
|---|---|
| **Nomenclatura de arquivo** | `*.spec.ts` para unitários/componentes; `*.e2e-spec.ts` (backend) e `*.spec.ts` em `/e2e` para E2E |
| **Dados de teste** | Usar factories (`makeUsuario()`, `makeAluno()`) — nunca copiar literais em cada teste |
| **Banco de dados** | Testes de integração usam banco MySQL separado (`sgoa_test`); nunca o banco de produção |
| **Variáveis de ambiente** | `.env.test` na raiz do backend; `TEST_DB_*` para banco de teste |
| **Mocks externos** | SES/S3/ClamAV sempre mockados em testes unitários e de integração |
| **Asserção negativa obrigatória** | Todo endpoint que tem RBAC deve ter ao menos um teste de perfil não-autorizado |
| **Seed de dados** | `beforeAll` para dados que não mudam no describe; `beforeEach` para dados que um teste pode alterar |
| **Limpeza** | `afterEach` ou `afterAll` com `DELETE` nas tabelas de teste ou `TRUNCATE` via script de seed |
| **Cobertura** | Meta: 80% de cobertura de branches nos Services; 60% nos Controllers |

### 19.6 Rodando os Testes Localmente

```bash
# Backend — testes unitários
cd backend
npm run test                        # todos os spec.ts
npm run test -- --testPathPattern=ocorrencias  # apenas um módulo
npm run test -- --coverage          # com relatório de cobertura

# Backend — testes de integração (requer banco sgoa_test rodando)
npm run test:e2e
npm run test:e2e -- --testPathPattern=ocorrencias

# Frontend — unitários de componentes
cd frontend
npm run test

# Frontend — E2E com Playwright (requer backend + frontend rodando)
npx playwright test
npx playwright test --headed        # com browser visível
npx playwright test e2e/registro-ocorrencia.spec.ts  # arquivo específico
npx playwright show-report          # abre relatório HTML após a execução
```

---

*Seção 19 adicionada em Abril/2026 — cobertura obrigatória para todas as features.*

---

## 20. Qualidade de Código e Arquitetura — Princípios do Projeto

> Esta seção traduz os princípios dos quatro livros de referência abaixo
> para as decisões concretas do SGOA. Consultar antes de escrever qualquer
> código novo.
>
> **Referências:**
> - *Clean Code* — Robert C. Martin (Uncle Bob)
> - *Refactoring* — Martin Fowler
> - *Domain-Driven Design* — Eric Evans
> - *Clean Architecture* — Robert C. Martin

---

### 20.1 Clean Code — Código que se Explica Sozinho

> **Princípio central:** o código é lido dezenas de vezes para cada vez que
> é escrito. Otimizar para leitura é otimizar para manutenção.

#### Nomes revelam intenção — não economize caracteres

```typescript
// ❌ ERRADO — abreviação, sem contexto
const oc = await this.repo.find({ where: { sev: 3, stat: 'AB' } });

// ✅ CORRETO — nome diz exatamente o que é
const ocorrenciasGravesAbertas = await this.ocorrenciaRepository.find({
  where: { severidade: 3, status: StatusOcorrencia.ABERTA }
});
```

**Regra do SGOA:** usar sempre os termos do Glossário (Seção 17) no código.
`ocorrencia`, `severidade`, `cienciaFormal`, `responsavelLegal` — nunca abreviar
para `oc`, `sev`, `cf`, `rl`. O código deve ser legível por um coordenador
técnico sem treinamento prévio.

#### Funções fazem uma coisa — e apenas uma

```typescript
// ❌ ERRADO — uma função fazendo três coisas
async processarOcorrencia(dto: CreateOcorrenciaDto, usuario: Usuario) {
  // verifica regras de negócio
  // persiste no banco
  // envia notificações
  // registra auditoria
  // calcula SLA
}

// ✅ CORRETO — cada responsabilidade isolada
async criar(dto: CreateOcorrenciaDto, registrador: Usuario): Promise<ResponseOcorrenciaDto> {
  await this.validarRegrasDeNegocio(dto, registrador);        // 1. validar
  const ocorrencia = await this.persistir(dto, registrador);  // 2. persistir
  await this.dispararEfeitosColaterais(ocorrencia);           // 3. consequências
  return this.toResponseDto(ocorrencia);                      // 4. serializar
}
```

**Limite de tamanho:** métodos de Service com mais de 25 linhas são candidatos
a extração. Controllers nunca ultrapassam 10 linhas por método.

#### Sem números e strings mágicas

```typescript
// ❌ ERRADO
if (ocorrencia.severidade >= 3 && idade < 18) { ... }
if (status === 'ARQUIVADA') { ... }

// ✅ CORRETO — constantes e enums revelam o significado
const SEVERIDADE_MINIMA_NOTIF_RESPONSAVEL = 3;
const MAIORIDADE_LEGAL = 18;

if (ocorrencia.severidade >= SEVERIDADE_MINIMA_NOTIF_RESPONSAVEL
    && idadeDoAluno < MAIORIDADE_LEGAL) { ... }
if (ocorrencia.status === StatusOcorrencia.ARQUIVADA) { ... }
```

Todas as constantes de domínio vivem em `src/common/constants/domain.constants.ts`.
Todos os enums vivem em `src/modules/<modulo>/enums/<nome>.enum.ts`.

#### Política de comentários — comentário é sinal de alerta

```typescript
// ❌ COMENTÁRIO INÚTIL — só repete o código
// Busca a ocorrência pelo id
const ocorrencia = await this.ocorrenciaRepository.findOne({ where: { id } });

// ✅ COMENTÁRIO LEGÍTIMO — explica o POR QUÊ, não o QUÊ
// ECA art. 56: infrequência acima de 25% de aluno menor exige comunicação
// ao Conselho Tutelar independentemente da severidade registrada
if (percentualFaltas > 0.25 && aluno.esMenorDeIdade()) {
  await this.conselhoTutelarService.notificar(ocorrencia);
}
```

**Regra:** se você sentiu necessidade de escrever um comentário para explicar
o que o código faz, o código precisa ser renomeado ou extraído — não comentado.
Comentários são reservados para decisões legais, de negócio ou de performance
que o código sozinho não consegue comunicar.

#### Boy Scout Rule — deixe o código melhor do que encontrou
Ao tocar um arquivo: renomear variáveis obscuras, extrair método sem nome, remover
`console.log` e `// TODO antigo`. Não reescrever tudo — apenas melhorar o caminho.

#### DRY — cada conhecimento tem uma única representação

```typescript
// ❌ ERRADO — regra de menor de idade em dois lugares
// Em NotificacoesService:
const esMenor = new Date().getFullYear() - aluno.dataNascimento.getFullYear() < 18;
// Em RelatoriosService:
const menorDeIdade = calcularIdade(aluno.dataNascimento) < 18;

// ✅ CORRETO — regra centralizada
// src/modules/alunos/alunos.utils.ts
export function calcularIdade(dataNascimento: Date): number {
  return differenceInYears(new Date(), dataNascimento);
}
export function eMenorDeIdade(dataNascimento: Date): boolean {
  return calcularIdade(dataNascimento) < MAIORIDADE_LEGAL;
}
```

---

### 20.2 Refactoring — Melhorar Sem Quebrar

> **Princípio central:** refatorar é mudar a estrutura interna do código
> sem alterar seu comportamento observável. Só é seguro com testes.

#### Code Smells — detectar antes de acumular

| Smell | Sintoma no SGOA | Refatoração indicada |
|---|---|---|
| **Long Method** | Service com > 30 linhas | Extract Method → métodos privados com nome |
| **Feature Envy** | `OcorrenciasService` calculando idade do aluno | Mover para `AlunosService` ou utilitário |
| **Data Clumps** | `campus + segmento + perfil` sempre juntos | Extrair interface `EscopoUsuario` |
| **Primitive Obsession** | `severidade: number` sem validação | Criar tipo `Severidade` com validação embutida |
| **Duplicate Code** | Mesma query em dois Services | Extrair para Repository customizado |
| **Large Class** | Module com > 5 services acoplados | Dividir em sub-módulos |
| **Magic Number** | `if (sev >= 4)` inline | Extrair constante nomeada |
| **Dead Code** | Método ou import nunca chamado | Remover sem cerimônia |

#### Gatilhos de Refatoração — quando parar e arrumar

```
Arquivo > 200 linhas           → dividir em classes/funções menores
Método > 25 linhas             → Extract Method
Parâmetros > 3 em um método    → agrupar em DTO/objeto de configuração
Mesmo bloco copiado 2x         → Extract Function + DRY
Dificuldade de escrever teste  → sinal de acoplamento excessivo
```

#### Refatoração segura — sempre com rede de segurança
Sequência: `teste verde → menor mudança possível → teste verde → commit`.
**Nunca** refatorar e adicionar feature no mesmo commit.

---

### 20.3 Domain-Driven Design — O Código Fala o Idioma do Negócio

> **Princípio central:** desenvolvedores e especialistas de domínio devem
> usar as mesmas palavras. Se a coordenadora diz "encaminhar para a psicóloga"
> e o código tem `createReferralRecord()`, existe ruído de tradução que gera bugs.

#### Linguagem Ubíqua — obrigatória no SGOA

O Glossário da Seção 17 **é a fonte de verdade dos termos**. Todo símbolo no
código — variável, método, classe, tabela — deve usar o termo do glossário:

| Termo do Domínio | Nome no Código | ❌ Não usar |
|---|---|---|
| Ocorrência | `Ocorrencia`, `ocorrencia` | `incident`, `event`, `record` |
| Encaminhamento | `Encaminhamento`, `encaminhar()` | `referral`, `forward`, `assign` |
| Ciência Formal | `CienciaFormal`, `confirmarCiencia()` | `acknowledgment`, `confirm`, `sign` |
| Severidade | `Severidade`, `severidade` | `priority`, `level`, `severity` |
| Responsável Legal | `ResponsavelLegal` | `guardian`, `parent`, `responsible` |
| Conselho Tutelar | `ConselhoTutelar`, `notificarConselhoTutelar()` | `council`, `authority` |

#### Bounded Contexts — cada módulo NestJS é um contexto

```
AuthModule          → contexto: Identidade e Acesso
AlunosModule        → contexto: Cadastro de Alunos
OcorrenciasModule   → contexto: Ciclo de Vida da Ocorrência (agregado central)
ValidacoesModule    → contexto: Workflow de Validação
EncaminhamentosModule → contexto: Plano de Ação
NotificacoesModule  → contexto: Comunicação
CienciaFormalModule → contexto: Confirmação Legal
AuditoriaModule     → contexto: Rastreabilidade (append-only)
SlaModule           → contexto: Monitoramento de Prazos
```

**Regra:** módulos não se chamam diretamente. Comunicação entre módulos ocorre
via eventos de domínio (`@nestjs/event-emitter`) ou via injeção explícita de serviço
declarada no módulo que importa. Nunca `import` direto de outro módulo interno.

#### Aggregate Root — Ocorrência é o centro

A entidade `Ocorrencia` é o **Aggregate Root** do contexto principal. Isso
significa:

```typescript
// ❌ ERRADO — criar Validação sem passar pela Ocorrência
await this.validacaoRepository.save({ ocorrenciaId, tipoDecisao: 'VALIDAR' });

// ✅ CORRETO — a Ocorrência orquestra suas próprias transições
await this.ocorrenciasService.validar(ocorrenciaId, dto, validador);
// Internamente: cria ValidacaoOcorrencia + atualiza status + dispara eventos
```

Toda operação que muda o estado de uma `Ocorrencia` deve passar pelo
`OcorrenciasService` — nunca manipular `ValidacaoRepository` ou
`EncaminhamentoRepository` diretamente de outro módulo.

#### Domain Events — nomear o que aconteceu, não o que fazer

Quando uma ocorrência é criada, o sistema não "chama o serviço de notificação" —
ele publica que "OcorrenciaCriada" aconteceu. Outros módulos reagem:

```typescript
// Nomes de eventos seguem o padrão: <Entidade><VerboPreteritoPerfeito>
'ocorrencia.criada'               // → SLA calcula prazo; Notificações verifica responsável
'ocorrencia.validada'             // → Notificações avisa registrador; SLA reinicia contador
'ocorrencia.slaSonVencido'        // → Escalamento automático
'ciencia.confirmada'              // → Ocorrência pode ser arquivada
'encaminhamento.prazoVencido'     // → Alerta ao coordenador
```

---

### 20.4 Clean Architecture — A Regra das Dependências

> **Princípio central:** as dependências de código-fonte apontam sempre
> para dentro — do banco de dados em direção às regras de negócio, nunca
> o contrário. O banco não sabe que existe o NestJS; o NestJS não sabe que
> existe o MySQL.

#### As camadas e o que cada uma pode importar

```
┌─────────────────────────────────────────────────────────┐
│  FRAMEWORKS & DRIVERS (Controllers, TypeORM, @nestjs/schedule) │
│  Pode importar: camada de Interface e Application        │
└──────────────────────────┬──────────────────────────────┘
                           ↓ (só esta direção)
┌─────────────────────────────────────────────────────────┐
│  INTERFACE ADAPTERS (DTOs, ResponseMappers, Repositories)│
│  Pode importar: camada de Application e Domain           │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  APPLICATION (Services — regras de caso de uso)          │
│  Pode importar: apenas Domain                            │
│  ❌ NUNCA importar: @nestjs/common, typeorm, Request      │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  DOMAIN (Entities, Enums, Interfaces de Repository)      │
│  Pode importar: NADA externo                             │
│  ❌ NUNCA importar: NestJS, TypeORM, @nestjs/schedule     │
└─────────────────────────────────────────────────────────┘
```

#### Services não conhecem HTTP

```typescript
// ❌ ERRADO — Service depende de detalhe de framework
import { Request } from 'express';
async criar(dto: CreateOcorrenciaDto, req: Request): Promise<ResponseOcorrenciaDto> {
  const usuario = req.user; // Service sabe que existe HTTP Request
}

// ✅ CORRETO — o Controller extrai o que o Service precisa
// No Controller:
async criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() usuario: Usuario) {
  return this.ocorrenciasService.criar(dto, usuario); // Service só recebe dados puros
}
// No Service:
async criar(dto: CreateOcorrenciaDto, registrador: Usuario): Promise<ResponseOcorrenciaDto> {
  // Nada aqui sabe que existe HTTP, NestJS ou Express
}
```

#### Repositories são interfaces — TypeORM é detalhe

```typescript
// src/modules/ocorrencias/repositories/ocorrencia.repository.interface.ts
export interface IOcorrenciaRepository {
  save(ocorrencia: Partial<Ocorrencia>): Promise<Ocorrencia>;
  findById(id: string): Promise<Ocorrencia | null>;
  listarPorEscopo(usuario: Usuario, filtros: FilterOcorrenciaDto): Promise<Ocorrencia[]>;
  contarReincidencias(alunoId: string, categoriaId: string, dias: number): Promise<number>;
}

// src/modules/ocorrencias/repositories/ocorrencia.repository.ts
// TypeORM implementa a interface — o Service injeta a interface, não o TypeORM
@Injectable()
export class OcorrenciaRepository implements IOcorrenciaRepository {
  constructor(
    @InjectRepository(Ocorrencia)
    private readonly typeormRepo: Repository<Ocorrencia>
  ) {}
  // implementações usando TypeORM internamente
}
```

O `OcorrenciasService` injeta `IOcorrenciaRepository` — se um dia o banco
mudar de MySQL para PostgreSQL, apenas o Repository muda. O Service não toca.

#### Regra de ouro — o teste revela a violação

```typescript
// Se o teste do Service precisar mockar o TypeORM diretamente → violação de arquitetura
// ❌ SINAL DE PROBLEMA:
const repo = module.get(getRepositoryToken(Ocorrencia)); // Service conhece TypeORM

// ✅ CORRETO:
const repo = module.get(IOcorrenciaRepository); // Service conhece apenas a interface
```


---


### 20.5 Checklist de Qualidade por Pull Request

Além do checklist da Seção 15 (pós-feature), revisar:

```
Clean Code:
[ ] Nomes de variáveis e métodos usam termos do Glossário (Seção 17)?
[ ] Nenhum método ultrapassa 25 linhas?
[ ] Nenhum número ou string literal sem nome de constante/enum?
[ ] Comentários explicam o POR QUÊ (decisão de negócio), não o QUÊ?
[ ] Código mais legível do que antes de entrar (Boy Scout Rule)?

Refactoring:
[ ] Nenhum code smell novo introduzido (ver tabela na Seção 20.2)?
[ ] Se refatoração foi feita, está em commit separado da feature?

DDD:
[ ] Módulos comunicam via eventos (@nestjs/event-emitter) ou importação explícita, nunca import direto?
[ ] Operações na Ocorrência passam pelo OcorrenciasService (Aggregate Root)?
[ ] Novos termos de domínio foram adicionados ao Glossário (Seção 17)?

Clean Architecture:
[ ] Services importam apenas DTOs, Entities e interfaces — sem @nestjs/common além de @Injectable?
[ ] Nenhum Repository concreto (TypeORM) injetado diretamente em Service?
[ ] Nenhum tipo HTTP (Request, Response, Headers) em Service ou Repository?

Simplicidade (ver 20.6):
[ ] Cada abstração nova tem um problema concreto justificando sua existência?
[ ] A solução mais simples foi considerada antes da mais sofisticada?
[ ] Um desenvolvedor sem contexto prévio consegue entender o código sem explicação oral?
```

---

### 20.6 Simplicidade como Princípio de Projeto

> **Regra máxima:** os padrões deste documento são ferramentas, não dogmas.
> Quando um padrão aumenta a complexidade sem resolver um problema real, ele
> está errado para este contexto. Simplifique.

#### YAGNI — You Ain't Gonna Need It

Não crie abstrações, interfaces ou camadas para problemas que ainda não existem.

```typescript
// ❌ PREMATURO — EventBus para um sistema com 2 módulos
this.eventBus.publish(new OcorrenciaCriadaEvent(ocorrencia));

// ✅ SUFICIENTE no início — chamada direta, refatore quando houver 3+ consumidores
await this.notificacoesService.verificarEDespachar(ocorrencia);
await this.slaService.iniciarMonitoramento(ocorrencia);
```

Quando o número de consumidores crescer e a chamada direta virar acoplamento
real, aí sim extraia o EventBus. Não antes.

#### KISS — Keep It Simple, Stupid

A solução correta para o problema atual, escrita de forma clara, vale mais do
que a solução perfeita para o problema hipotético futuro.

```typescript
// ❌ COMPLEXO SEM NECESSIDADE
class SlaCalculatorStrategyRegistry {
  register(severidade: number, strategy: ISlaStrategy): void { ... }
  resolve(severidade: number): ISlaStrategy { ... }
}

// ✅ SIMPLES E CORRETO — o problema é um switch de 5 casos
function calcularPrazo(severidade: number, criadoEm: Date): Date {
  if (severidade === 5) return addHours(criadoEm, 4);
  if (severidade === 4) return addHours(criadoEm, 24);
  if (severidade === 3) return addBusinessDays(criadoEm, 2);
  if (severidade === 2) return addBusinessDays(criadoEm, 3);
  return addBusinessDays(criadoEm, 5);
}
```

#### Quando os padrões se justificam no SGOA

| Padrão | Usar quando | Não usar quando |
|---|---|---|
| Repository como interface | O Service precisa ser testável sem banco | Há apenas um banco e zero chance de trocar |
| @nestjs/schedule / @Cron | A operação precisa rodar em intervalo fixo (SLA, alertas) | É disparada por request — use fire-and-forget direto |
| Domain Event | Há 3+ consumidores reagindo ao mesmo evento | Há 1 consumidor — chame diretamente |
| Bounded Context separado | O módulo tem ciclo de vida independente | É só outro Service no mesmo domínio |
| State Machine explícita | Há 5+ estados com transições proibidas | Há 2-3 estados sem restrição |

#### A pergunta de ouro antes de qualquer abstração

> *"Se eu remover isso agora e precisar depois, quanto tempo leva para recriar?"*

Se a resposta for "menos de uma hora", não crie ainda. Crie quando o problema
aparecer. O código mais fácil de manter é o que não existe.

---

*Seção 20 adicionada em Abril/2026 — referências: Clean Code, Refactoring, DDD, Clean Architecture.*
*Seção 20.6 adicionada em Abril/2026 — princípio de simplicidade como regra de projeto.*

---

## 21. Convenções de API, JWT e Ordem de Implementação

> Seção de referência rápida. Consultar antes de criar qualquer Controller,
> endpoint ou iniciar um novo módulo.

### 21.1 Convenções de API REST

**Prefixo global:** `/api/v1` — configurado em `main.ts` via `app.setGlobalPrefix('api/v1')`.

**Padrão de URLs:**
```
GET    /api/v1/ocorrencias              → listar (paginado, filtrado)
POST   /api/v1/ocorrencias              → criar
GET    /api/v1/ocorrencias/:id          → buscar por id
PATCH  /api/v1/ocorrencias/:id          → atualizar parcialmente
GET    /api/v1/ocorrencias/:id/validacoes    → sub-recurso
POST   /api/v1/ocorrencias/:id/validacoes   → criar sub-recurso
```
Plural sempre. Verbos HTTP definem ação — nunca `/criar-ocorrencia`.

**Envelope de paginação (toda listagem retorna este formato):**
```typescript
interface PaginatedResponseDto<T> {
  data:        T[];
  total:       number;   // total de registros no banco (com filtros)
  page:        number;   // página atual (começa em 1)
  pageSize:    number;   // itens por página (default: 20, max: 100)
  totalPages:  number;   // ceil(total / pageSize)
}
```

**Parâmetros de paginação no DTO de filtro (base para todos os módulos):**
```typescript
// src/common/dto/paginated-filter.dto.ts
export class PaginatedFilterDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number)
  page: number = 1;

  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number)
  pageSize: number = 20;
}
// Todos os FilterDto estendem PaginatedFilterDto
```

**Formato de erro padronizado (HttpExceptionFilter retorna sempre este shape):**
```typescript
// src/common/filters/http-exception.filter.ts
{
  "statusCode": 403,
  "error":      "Forbidden",
  "message":    "RN-08: Coordenador não pode validar ocorrência que ele mesmo registrou.",
  "timestamp":  "2026-04-25T10:30:00.000Z",
  "path":       "/api/v1/ocorrencias/uuid/validar"
}
```

**Swagger/OpenAPI:** configurar conforme §21.4 abaixo.
URI: `http://localhost:3001/api/docs`. Nunca expor em produção.

---

### 21.2 Payload do JWT Interno

Emitido pelo `AuthService` após validação SSO. É o que `@CurrentUser()` extrai
em todos os Controllers.

```typescript
// src/modules/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub:       string;          // usuario.id (UUID)
  email:     string;
  nome:      string;
  perfil:    PerfilUsuario;
  campus:    string;
  segmentos: Segmento[];      // segmentosResponsaveis do Usuario
  iat:       number;          // emitido em (Unix timestamp)
  exp:       number;          // expira em (iat + SESSION_TIMEOUT_HOURS)
}

// src/modules/auth/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user?.[data] : user;
  }
);
```

---

### 21.3 Ordem de Implementação dos Módulos

Seguir esta sequência — cada módulo depende dos anteriores.

| Ordem | Módulo NestJS | RF | Motivo da precedência |
|---|---|---|---|
| 1 | `AuthModule` | RF-01 | Toda rota protegida depende de JwtAuthGuard + RolesGuard |
| 2 | `UsuariosModule` | RF-14 | Admin precisa atribuir perfil/campus antes de qualquer uso |
| 3 | `ConfiguracaoModule` | RF-15 | Campus e categorias são FK obrigatórias nos demais módulos |
| 4 | `AlunosModule` | RF-02 | Ocorrência exige aluno existente (RN-01) |
| 5 | `ResponsaveisModule` | — | Notificações de menor dependem de responsável cadastrado |
| 6 | `CategoriasModule` | RF-15 | Subcomplexo de ConfiguracaoModule — CRUD de categorias |
| 7 | `OcorrenciasModule` | RF-03, RF-06 | Aggregate Root — demais módulos dependem dele |
| 8 | `AuditoriaModule` | RF-10 | AuditInterceptor global deve estar ativo antes dos módulos de negócio |
| 9 | `SlaModule` | RF-04/RF-06 | SLA calculado no momento da criação da ocorrência |
| 10 | `ValidacoesModule` | RF-04 | Depende de Ocorrência e SLA |
| 11 | `EncaminhamentosModule` | RF-05 | Depende de Ocorrência validada |
| 12 | `EvidenciasModule` | RF-07 | Depende de Ocorrência existente (upload por id) |
| 13 | `NotificacoesModule` | RF-08 | Depende de Ocorrência, Aluno, Responsável |
| 14 | `DashboardModule` | RF-09 | Queries de agregação sobre ocorrências existentes |
| 15 | `RelatoriosModule` | RF-11 | Depende de toda a cadeia acima |
| 16 | `CienciaFormalModule` | RF-12 | Depende de Ocorrência + Responsável/Aluno |
| 17 | `AlertaReincidenciaModule` | RF-13 | Integrado ao OcorrenciasService.criar() — pode ser último |

**Seed mínimo de dados (executar após migrations antes de qualquer teste):**
```bash
# src/database/seeds/seed-dev.ts — rodar com: npm run seed:dev
# 1. Criar campus: ['Campus A', 'Campus B']
# 2. Criar CategoriaOcorrencia: Disciplinar, Acadêmica, Saúde/Bem-estar
# 3. Criar Usuarios de teste:
#    professor@escola.edu.br  (perfil: PROFESSOR,   campus: Campus A, segmento: FUNDAMENTAL)
#    coordenador@escola.edu.br (perfil: COORDENADOR, campus: Campus A, segmento: FUNDAMENTAL)
#    diretor@escola.edu.br    (perfil: DIRETOR,      campus: Campus A)
#    admin@escola.edu.br      (perfil: ADMIN)
# 4. Criar Alunos de teste (1 menor Fund., 1 maior Superior) com ResponsavelLegal
```

---

### 21.4 Documentação Swagger / OpenAPI

> O Swagger serve dois propósitos no SGOA: documentação viva da API para o
> frontend, e ferramenta de teste manual durante o desenvolvimento. Configurar
> corretamente desde o primeiro módulo evita retrabalho em todos os DTOs.

#### Configuração em `main.ts`

```typescript
// src/main.ts
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // ... cors, helmet, prefix, pipes ...

  // Swagger — apenas fora de produção
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SGOA — Sistema de Gestão de Ocorrências Acadêmicas')
      .setDescription('API REST para gestão do ciclo de vida de ocorrências acadêmicas')
      .setVersion('1.0')
      .addBearerAuth(          // habilita o botão "Authorize" no Swagger UI
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'jwt'                  // nome do esquema — referenciar nos controllers
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
}
```

#### Decorando DTOs com `@ApiProperty`

Todo DTO de entrada e de resposta deve ter seus campos documentados:

```typescript
// src/modules/ocorrencias/dto/create-ocorrencia.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOcorrenciaDto {
  @ApiProperty({ description: 'UUID do aluno', example: 'uuid-v4' })
  @IsUUID()
  alunoId: string;

  @ApiProperty({ enum: Segmento, description: 'Segmento de ensino do aluno' })
  @IsEnum(Segmento)
  segmento: Segmento;

  @ApiProperty({ minimum: 1, maximum: 5, example: 3, description: 'Nível de severidade' })
  @IsInt() @Min(1) @Max(5)
  severidade: number;

  @ApiProperty({ example: '2026-04-25', description: 'Data em que o incidente ocorreu' })
  @IsDateString()
  dataIncidente: string;

  @ApiProperty({ example: 'Sala 204 — Bloco B' })
  @IsString() @MaxLength(200)
  local: string;

  @ApiProperty({ example: 'Descrição detalhada do ocorrido...' })
  @IsString() @MinLength(20)
  descricao: string;

  @ApiPropertyOptional({ description: 'Subcategoria específica dentro da categoria' })
  @IsOptional() @IsString()
  subcategoria?: string;
}
```

#### Decorando Controllers com `@ApiTags`, `@ApiOperation`, `@ApiResponse`

```typescript
// src/modules/ocorrencias/ocorrencias.controller.ts
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Ocorrências')           // agrupa no Swagger UI
@ApiBearerAuth('jwt')             // indica que todos os endpoints exigem JWT
@Controller('ocorrencias')
export class OcorrenciasController {

  @Post()
  @ApiOperation({ summary: 'Registrar nova ocorrência' })
  @ApiResponse({ status: 201, description: 'Ocorrência criada', type: OcorrenciaResponseDto })
  @ApiResponse({ status: 400, description: 'Dados inválidos (DTO malformado ou RN violada)' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão para registrar' })
  @Roles(PerfilUsuario.PROFESSOR, PerfilUsuario.COORDENADOR)
  async criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() user: Usuario) {
    return this.ocorrenciasService.criar(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências (escopo do usuário autenticado)' })
  @ApiResponse({ status: 200, description: 'Lista paginada', type: PaginatedOcorrenciaResponseDto })
  async listar(@Query() filtros: FilterOcorrenciaDto, @CurrentUser() user: Usuario) {
    return this.ocorrenciasService.listar(filtros, user);
  }
}
```

#### Documentando ResponseDtos

```typescript
// src/modules/ocorrencias/dto/ocorrencia-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class OcorrenciaResponseDto {
  @ApiProperty({ example: 'uuid-v4' })
  id: string;

  @ApiProperty({ example: 'OC-2026-00142-FM' })
  codigo: string;

  @ApiProperty({ enum: StatusOcorrencia })
  status: StatusOcorrencia;

  @ApiProperty({ minimum: 1, maximum: 5 })
  severidade: number;
}

// Wrapper de paginação tipado para Swagger
export class PaginatedOcorrenciaResponseDto {
  @ApiProperty({ type: [OcorrenciaResponseDto] })
  data: OcorrenciaResponseDto[];

  @ApiProperty({ example: 150 }) total: number;
  @ApiProperty({ example: 1 })   page: number;
  @ApiProperty({ example: 20 })  pageSize: number;
  @ApiProperty({ example: 8 })   totalPages: number;
}
```

#### Regras obrigatórias para Swagger no SGOA

```
[ ] Todo DTO de entrada tem @ApiProperty em cada campo obrigatório
[ ] Todo DTO de resposta tem @ApiProperty com type ou enum correto
[ ] Todo Controller tem @ApiTags com o nome do módulo em português
[ ] Todo endpoint tem @ApiOperation com summary de uma linha
[ ] Todo endpoint documenta ao menos os status 2xx, 400, 401 e 403
[ ] Campos sensíveis (cpfEncriptado) NUNCA aparecem em ResponseDto nem no Swagger
[ ] @ApiBearerAuth('jwt') em todo Controller protegido por JwtAuthGuard
```

> **Convenção de tags (manter consistência no Swagger UI):**
> `Autenticação` · `Alunos` · `Responsáveis` · `Categorias` · `Ocorrências`
> · `Validações` · `Encaminhamentos` · `Evidências` · `Notificações`
> · `Ciência Formal` · `Relatórios` · `Dashboard` · `Auditoria`


---

*Seção 21 adicionada em Abril/2026 — convenções de API, JWT payload, ordem de implementação.*

---

## 22. Enums Canônicos do Domínio

> **Fonte de verdade para todos os valores de enum.** Todo módulo que referenciar
> um enum deve importar daqui — nunca redefinir. Inconsistências entre módulos
> são a causa raiz de bugs silenciosos em sistemas multi-perfil.

```typescript
// src/modules/auth/enums/perfil-usuario.enum.ts
export enum PerfilUsuario {
  PROFESSOR         = 'PROFESSOR',
  COORDENADOR       = 'COORDENADOR',
  EQUIPE_PEDAGOGICA = 'EQUIPE_PEDAGOGICA',  // "Eq.Ped." na matriz §11
  DIRETOR           = 'DIRETOR',
  SECRETARIA        = 'SECRETARIA',
  ADMIN             = 'ADMIN',
  ALUNO             = 'ALUNO',
  RESPONSAVEL_LEGAL = 'RESPONSAVEL_LEGAL',  // "Resp." na matriz §11
}

// src/modules/alunos/enums/segmento.enum.ts
export enum Segmento {
  FUNDAMENTAL = 'FUNDAMENTAL',
  MEDIO       = 'MEDIO',
  SUPERIOR    = 'SUPERIOR',
}

// src/modules/alunos/enums/status-aluno.enum.ts
export enum StatusAluno {
  ATIVO       = 'ATIVO',
  INATIVO     = 'INATIVO',
  TRANSFERIDO = 'TRANSFERIDO',
  FORMADO     = 'FORMADO',
}

// src/modules/ocorrencias/enums/status-ocorrencia.enum.ts
export enum StatusOcorrencia {
  ABERTA               = 'ABERTA',
  AGUARDANDO_VALIDACAO = 'AGUARDANDO_VALIDACAO',
  EM_ACOMPANHAMENTO    = 'EM_ACOMPANHAMENTO',
  RESOLVIDA            = 'RESOLVIDA',
  ARQUIVADA            = 'ARQUIVADA',
  REVISAO              = 'REVISAO',
}
// Transições válidas: ver P-03 (§10) — state machine obrigatória

// src/modules/ocorrencias/enums/ciencia-formal-status.enum.ts
export enum CienciaFormalStatus {
  PENDENTE   = 'PENDENTE',    // token ainda não enviado
  ENVIADA    = 'ENVIADA',     // e-mail/link enviado, aguardando confirmação
  CONFIRMADA = 'CONFIRMADA',  // token consumido — data_confirmacao preenchida
  EXPIRADA   = 'EXPIRADA',    // prazo de 5 dias úteis venceu sem confirmação
}

// src/modules/validacoes/enums/tipo-decisao.enum.ts
export enum TipoDecisao {
  VALIDAR  = 'VALIDAR',   // coordenador aprova e ocorrência avança
  DEVOLVER = 'DEVOLVER',  // devolve ao registrador para correção → REVISAO
  ESCALAR  = 'ESCALAR',   // encaminha para nível superior (diretor)
}

// src/modules/encaminhamentos/enums/status-encaminhamento.enum.ts
export enum StatusEncaminhamento {
  PENDENTE  = 'PENDENTE',
  EXECUTADO = 'EXECUTADO',
  VENCIDO   = 'VENCIDO',
}

// src/modules/notificacoes/enums/canal-notificacao.enum.ts
export enum CanalNotificacao {
  EMAIL  = 'EMAIL',
  IN_APP = 'IN_APP',
}

// src/modules/notificacoes/enums/status-notificacao.enum.ts
export enum StatusNotificacao {
  ENVIADO = 'ENVIADO',
  FALHOU  = 'FALHOU',
  LIDO    = 'LIDO',
}

// src/modules/comentarios/enums/tipo-comentario.enum.ts
export enum TipoComentario {
  OBSERVACAO      = 'OBSERVACAO',      // qualquer perfil autorizado
  CONTRARRAZAO    = 'CONTRARRAZAO',    // apenas aluno SUPERIOR — RN-13
  NOTA_COMPLIANCE = 'NOTA_COMPLIANCE', // permitido em ocorrência ARQUIVADA — RN-12
}
```

> **Regra de import no código:**
> ```typescript
> // ✅ CORRETO — importar sempre do enum canônico
> import { PerfilUsuario } from '@/modules/auth/enums/perfil-usuario.enum';
> // ❌ ERRADO — nunca usar string literal onde existe enum
> if (usuario.perfil === 'COORDENADOR') { ... }
> ```

---

*Seção 22 adicionada em Abril/2026 — enums canônicos para consistência entre módulos.*

---

## 23. Convenção de Commits e Branches

> Padrão adotado: **Conventional Commits 1.0** — usado pelo NestJS, Angular, Vue
> e a maioria do ecossistema Node.js. Ferramentas como `semantic-release` e
> `conventional-changelog` consomem esse formato para gerar changelogs e versões
> automaticamente.

### 23.1 Formato da Mensagem de Commit

```
<tipo>(<escopo>): <descrição curta em português>

[corpo opcional — explica o POR QUÊ, não o que o código faz]

[rodapé opcional — referências a RFs, RNs, breaking changes]
```

**Regras obrigatórias:**
- Linha do título: máximo 72 caracteres
- Tipo e escopo sempre em inglês minúsculo
- Descrição em português, imperativo, sem ponto final
- Corpo e rodapé separados do título por linha em branco

---

### 23.2 Tipos Permitidos

| Tipo | Quando usar |
|---|---|
| `feat` | Nova feature ou endpoint (gera entrada no CHANGELOG) |
| `fix` | Correção de bug (gera entrada no CHANGELOG) |
| `test` | Adição ou correção de testes — sem mudança de lógica |
| `refactor` | Mudança interna sem alterar comportamento observável |
| `docs` | Documentação: CLAUDE.md, DOC_EDUCATIVO.md, Swagger, comentários |
| `chore` | Configuração, dependências, scripts, tooling |
| `perf` | Melhoria de performance (índices, queries, cache) |
| `ci` | Pipelines, GitHub Actions, Docker, scripts de CI/CD |
| `style` | Formatação pura (Prettier, ESLint fix) — sem mudança de lógica |

> `feat` e `fix` são os únicos tipos que geram entrada no CHANGELOG.
> Todos os outros são agrupados como "internal changes".

---

### 23.3 Escopos do SGOA

Usar sempre um dos escopos abaixo — mantém o histórico navegável por módulo:

```
Backend:    auth · usuarios · alunos · responsaveis · categorias · ocorrencias
            validacoes · encaminhamentos · evidencias · notificacoes · sla
            auditoria · relatorios · ciencia-formal · dashboard

Frontend:   ui · forms · hooks · pages

Infra:      db · docker · ci · env

Projeto:    claude · docs
```

---

### 23.4 Exemplos Reais do SGOA

```bash
# Nova feature
feat(ocorrencias): implementar POST /ocorrencias com validação RN-01 e RN-07

# Bug fix com referência à regra
fix(sla): corrigir cálculo de prazo em fins de semana usando date-fns-business-days

# Relacionando ao RF
feat(auth): implementar JwtStrategy e decorator @CurrentUser

Implementa RF-01. Token carrega sub, perfil, campus e segmentos
conforme payload definido em §21.2 do CLAUDE.md.

# Testes
test(validacoes): adicionar asserção negativa RN-08 — coordenador não valida a própria

# Refatoração (não aparece no CHANGELOG)
refactor(notificacoes): extrair deveNotificarResponsavel() para método isolado

# Breaking change — adicionar ! após o escopo
feat(ocorrencias)!: remover campo 'tipo' — substituído por CategoriaOcorrencia

BREAKING CHANGE: o campo 'tipo' foi removido da entidade Ocorrencia.
Usar 'categoria.nome' como substituto.

# Documentação
docs(claude): adicionar H-16 graceful shutdown e RF-14/RF-15 ao CLAUDE.md

# Infra
chore(db): adicionar índices de performance em ocorrencias e auditorias
```

---

### 23.5 Nomenclatura de Branches

```
feature/<rf-id>-<descricao-curta>    →  feature/rf-03-registro-ocorrencia
fix/<descricao-curta>                →  fix/sla-calculo-feriados
hotfix/<descricao-curta>             →  hotfix/notificacao-responsavel-menor
refactor/<descricao-curta>           →  refactor/ocorrencias-service-extrair-metodos
test/<descricao-curta>               →  test/auth-rbac-assertions
docs/<descricao-curta>               →  docs/swagger-ocorrencias
chore/<descricao-curta>              →  chore/atualizar-nestjs-10
```

**Regras de branch:**
- `main` — sempre deployável, CI obrigatoriamente verde
- `develop` — integração contínua; merge de features antes de ir para main
- Nunca commitar diretamente em `main` ou `develop`
- Branch de vida curta: abrir, implementar, revisar, mergear, deletar
- Nome em kebab-case, sem acentos, máximo 50 caracteres

---

### 23.6 Estratégia de Merge

| Situação | Estratégia | Motivo |
|---|---|---|
| Feature branch → develop | **Squash merge** | Mantém histórico de `develop` limpo com 1 commit por feature |
| develop → main | **Merge commit** | Preserva o ponto exato de cada release no histórico |
| Hotfix → main | **Merge commit** | Rastreabilidade da correção urgente |
| Refactor branch | **Squash merge** | Comprime WIP commits em 1 commit semântico |

> **Nunca usar `git push --force` em `main` ou `develop`.**
> Em branches de feature, `--force-with-lease` é permitido (reescreve apenas
> se nenhum outro commit foi adicionado desde o último pull).

---

### 23.7 Checklist Antes do Commit

```
[ ] Mensagem segue o formato: tipo(escopo): descrição
[ ] Tipo correto para o conteúdo (feat vs refactor vs fix)
[ ] Escopo é um dos escopos definidos em §23.3
[ ] Descrição em português, imperativo, sem ponto final, ≤ 72 chars
[ ] CI passa localmente (npm run test + npm run lint)
[ ] Refatoração e feature em commits separados (nunca juntos)
[ ] Breaking change documentado com ! e BREAKING CHANGE no rodapé
[ ] Referências a RF/RN no corpo quando relevante
```

---

*Seção 23 adicionada em Abril/2026 — Conventional Commits 1.0 + estratégia de branches.*
