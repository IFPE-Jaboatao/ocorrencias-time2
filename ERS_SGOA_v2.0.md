# ERS — Radar Acadêmico (SGOA v2.0)
## Especificação de Requisitos de Sistema — As-Built

> **Versão:** 2.0 — Maio/2026
> **Status:** Documento vivo — reflete o estado implementado do sistema
> **Substitui:** `ERS_SGOA_v1.0.docx` (Baseline Abril/2026)
>
> Este documento foi gerado a partir da auditoria cruzada entre:
> - Histórico de commits Git (05/2026)
> - Código-fonte implementado (`backend/src/modules/`)
> - `CLAUDE.md` v2.0 (memória técnica do projeto)
> - `JORNADAS_USUARIO.md` (cobertura de testes por perfil)
>
> Divergências em relação à ERS v1.0 estão marcadas com ⚠️.
> Itens não implementados na v1 estão marcados com 🔜.

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Nome e Identidade do Sistema](#2-nome-e-identidade-do-sistema)
3. [Stack Tecnológico](#3-stack-tecnológico)
4. [Autenticação e Sessão](#4-autenticação-e-sessão)
5. [Modelo de Dados — As-Built](#5-modelo-de-dados--as-built)
6. [Requisitos Funcionais](#6-requisitos-funcionais)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [RBAC — Matriz de Permissões](#8-rbac--matriz-de-permissões)
9. [Taxonomia de Ocorrências e SLA](#9-taxonomia-de-ocorrências-e-sla)
10. [Ciclo de Vida da Ocorrência](#10-ciclo-de-vida-da-ocorrência)
11. [APIs Implementadas](#11-apis-implementadas)
12. [Conformidade Legal](#12-conformidade-legal)
13. [Decisões Arquiteturais](#13-decisões-arquiteturais)
14. [Escopo da v1 — Entregue e Pendente](#14-escopo-da-v1--entregue-e-pendente)
15. [Histórico de Alterações](#15-histórico-de-alterações)

---

## 1. Visão Geral

O **Radar Acadêmico** é um sistema web para gestão do ciclo de vida completo de ocorrências acadêmicas em uma **Instituição de Ensino Mista** (Ensino Fundamental, Médio e Superior).

O sistema registra, classifica, encaminha e arquiva ocorrências disciplinares, acadêmicas, comportamentais e de saúde/bem-estar de alunos. Todos os fluxos são diferenciados por segmento de ensino e regulados pelas obrigações do **ECA** e da **LGPD**.

### Por que este sistema é crítico

- Envolve dados de **menores de idade** → restrições do ECA + LGPD art. 14
- Gera **efeitos legais** (disciplinares, judiciais) → toda decisão exige trilha de auditoria imutável
- Serve múltiplos stakeholders com **interesses conflitantes** (professor, aluno, responsável, Conselho Tutelar, Ministério Público)
- Falha de notificação a responsável legal em ocorrência de severidade ≥ 3 é **infração legal**, não apenas bug de produto

---

## 2. Nome e Identidade do Sistema

> ⚠️ **Alteração em relação à ERS v1.0:** O sistema foi renomeado de **SGOA** para **Radar Acadêmico** durante o desenvolvimento (commit `feat(ui): renomear aplicação de SGOA para Radar Acadêmico`, 06/05/2026). A sigla SGOA permanece em uso interno nos nomes de banco de dados, variáveis de ambiente e documentação técnica.

| Atributo | Valor |
|----------|-------|
| **Nome comercial** | Radar Acadêmico |
| **Nome técnico** | SGOA — Sistema de Gestão de Ocorrências Acadêmicas |
| **Banco de dados** | `sgoa` (produção) / `sgoa_test` (testes) |
| **Prefixo de API** | `/api/v1` |
| **Swagger UI** | `/api/docs` (bloqueado em produção) |

---

## 3. Stack Tecnológico

### Backend

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Linguagem | TypeScript | 5.x |
| Framework | NestJS | 10.x |
| ORM | TypeORM | 0.3.x |
| Banco de dados | MySQL | 8.0 |
| Agendamento | @nestjs/schedule | 4.x |
| Eventos internos | @nestjs/event-emitter | — |
| Autenticação | Passport.js + JWT | — |
| Sessão | HttpOnly cookies (access 8h + refresh 7d) | — |
| Upload de arquivos | Multer + AWS S3 SDK v3 + presigned URLs | — |
| E-mail | Nodemailer + SMTP | — |
| Testes | Jest + Supertest | — |
| Validação | class-validator + class-transformer | — |
| Segurança | Helmet + CSRF double-submit + ThrottlerGuard | — |

### Frontend

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.x |
| Linguagem | TypeScript | 5.x |
| Estado remoto | TanStack Query | 5.x |
| Formulários | React Hook Form + Zod | — |
| Estilo | Tailwind CSS | 3.x |
| Testes | Jest + React Testing Library | — |

### Infra / Deploy

| Item | Tecnologia |
|------|-----------|
| Containerização | Docker + Docker Compose |
| CI/CD | GitHub Actions (pipeline multi-stage) |
| Storage de evidências | AWS S3 (presigned URLs) |
| Monitoramento | Sentry (erros) |

---

## 4. Autenticação e Sessão

> ⚠️ **Alteração em relação à ERS v1.0:** A ERS original especificava **SSO obrigatório via Azure AD / Google OAuth**. Durante o desenvolvimento, optou-se por **Magic Link** como mecanismo de autenticação principal, eliminando a dependência de provedores externos e simplificando o ambiente de desenvolvimento e testes.

### 4.1 Fluxo Magic Link

```
1. Usuário informa e-mail
2. Sistema verifica se e-mail existe em `usuarios` com `ativo = true`
3. Sistema gera token SHA-256 de UUID aleatório (TTL: 15 minutos)
4. Token é persistido na tabela `magic_link_tokens` (uso único)
5. E-mail com link de acesso é enviado via Nodemailer/SMTP
6. Usuário clica no link → token é verificado e invalidado (single-use)
7. Sistema emite par de tokens: JWT (8h) + Refresh Token (7 dias, SHA-256)
8. Tokens entregues como cookies HttpOnly (não acessíveis por JavaScript)
```

**Rate limiting:** 3 tentativas por minuto por IP (decorator `@Throttle`).

**Dev login:** endpoint `POST /api/v1/auth/dev-login` disponível apenas com `DEV_LOGIN_ENABLED=true` (bloqueado em produção).

### 4.2 JWT Payload

```typescript
interface JwtPayload {
  sub:                  string;     // usuario.id (UUID)
  email:                string;
  nome:                 string;
  perfil:               PerfilUsuario;
  campus:               string;
  segmentosResponsaveis: Segmento[];
  iat:                  number;     // Unix timestamp
  exp:                  number;     // iat + 8h
}
```

### 4.3 Renovação de Sessão

- `POST /api/v1/auth/refresh` — usa o refresh token (cookie HttpOnly) para emitir novo par de tokens
- Refresh tokens têm expiração de 7 dias e são rotacionados a cada uso
- `POST /api/v1/auth/logout` — invalida o refresh token no banco e limpa os cookies

### 4.4 CSRF

- Double-submit pattern: cookie `csrf-token` (não-HttpOnly) + header `X-CSRF-Token`
- `GET /api/v1/auth/csrf-token` emite o cookie de CSRF
- Todos os endpoints de mutação (POST, PATCH, DELETE, PUT) validam o header CSRF

### 4.5 Segurança Adicional

| Medida | Implementação |
|--------|--------------|
| Rate limiting global | 100 req/min por IP (ThrottlerGuard global) |
| Headers HTTP | Helmet (CSP, X-Frame-Options, HSTS, etc.) |
| CORS | Restrito ao `FRONTEND_URL` (env var) |
| Cookies | `HttpOnly: true`, `SameSite: lax`, `Secure: true` em produção |
| Tokens | SHA-256 de UUID aleatório — nunca armazenado em texto plano |

---

## 5. Modelo de Dados — As-Built

> **Convenções:**
> - `[enc]` = armazenado criptografado (AES-256-GCM). Nunca logar.
> - `json` = coluna JSON do MySQL (sem tipo array nativo)
> - ⚠️ = divergência em relação à ERS v1.0

### 5.1 Usuario

```typescript
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       nome: string;
  @Column({ unique: true })       email: string;
  @Column({ type: 'enum', enum: PerfilUsuario }) perfil: PerfilUsuario;
  @Column()                       campus: string;
  @Column({ type: 'json' })       segmentosResponsaveis: Segmento[];
  @Column({ default: true })      ativo: boolean;
  @Column({ nullable: true, type: 'datetime' }) ultimoAcesso: Date | null;
  @OneToMany(() => UsuarioTurma, ut => ut.usuario) turmas: UsuarioTurma[];
}
```

> ⚠️ Campo `cpfEncriptado` planejado na ERS v1.0 não foi implementado na v1. Previsto para v1.1.

### 5.2 Aluno

```typescript
@Entity('alunos')
export class Aluno {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       matricula: string;
  @Column()                       nome: string;
  @Column({ type: 'date' })       dataNascimento: Date;
  @Column({ type: 'enum', enum: Segmento })   segmento: Segmento;
  @Column()                       campus: string;
  @Column()                       curso: string;
  @Column()                       turma: string;   // nome da turma (string)
  @Column({ type: 'enum', enum: StatusAluno, default: StatusAluno.ATIVO })
                                  status: StatusAluno;
  @CreateDateColumn()             criadoEm: Date;
  @UpdateDateColumn()             atualizadoEm: Date;
}
```

> ⚠️ Campo `turma` é o **nome da turma como string** (ex: `'5A'`). A relação com a entidade `Turma` é feita por nome+campus — não há FK direta. Isso foi decidido para preservar o histórico mesmo que a turma seja renomeada.

### 5.3 Responsavel ⚠️

> **Alteração em relação à ERS v1.0:** O modelo foi normalizado de `ResponsavelLegal` (1:N simples) para `Responsavel` + `AlunoResponsavel` (M:N com deduplicação por e-mail). Isso suporta o cenário de irmãos compartilhando o mesmo responsável sem duplicar o cadastro.

```typescript
@Entity('responsaveis')
export class Responsavel {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       nome: string;
  @Column({ unique: true })       email: string;   // chave de deduplicação
  @Column()                       telefone: string;
  @OneToMany(() => AlunoResponsavel, ar => ar.responsavel)
                                  vinculos: AlunoResponsavel[];
}

@Entity('aluno_responsavel')
export class AlunoResponsavel {
  @Column({ type: 'uuid' })       alunoId: string;      // PK composta
  @Column({ type: 'uuid' })       responsavelId: string; // PK composta
  @Column()                       parentesco: string;   // ex: 'Mãe', 'Avó', 'Tutor'
  @Column({ default: true })      receberNotificacoes: boolean;
  @Column({ nullable: true, type: 'datetime' }) validadoEm: Date | null;
  @ManyToOne(() => Aluno)         aluno: Aluno;
  @ManyToOne(() => Responsavel)   responsavel: Responsavel;
}
```

### 5.4 Turma ⚠️

> **Adição em relação à ERS v1.0:** A ERS v1.0 não previa a entidade `Turma` — apenas o campo `turma: string` no `Aluno`. Durante a implementação de RN-07 (professor registra apenas alunos de sua turma), foi necessário normalizar turmas como entidade própria com a tabela de vínculo `UsuarioTurma`.

```typescript
@Entity('turmas')
export class Turma {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       nome: string;
  @Column({ type: 'enum', enum: Segmento })  segmento: Segmento;
  @Column()                       campus: string;
  @Column()                       curso: string;
  @Column()                       anoLetivo: number;
  @Column({ type: 'enum', enum: Turno })     turno: Turno;  // MANHA|TARDE|NOITE|INTEGRAL
  @Column({ default: true })      ativo: boolean;
}

@Entity('usuario_turmas')
export class UsuarioTurma {
  @Column({ type: 'uuid' })       usuarioId: string;   // PK composta
  @Column({ type: 'uuid' })       turmaId: string;     // PK composta
  @Column({ type: 'enum', enum: PapelUsuarioTurma })
                                  papel: PapelUsuarioTurma; // PROFESSOR | COORDENADOR_TURMA
  @Column({ default: true })      ativo: boolean;
  @ManyToOne(() => Usuario)       usuario: Usuario;
  @ManyToOne(() => Turma)         turma: Turma;
}
```

### 5.5 CategoriaOcorrencia ⚠️

> **Alteração em relação à ERS v1.0:** O campo `subcategorias` foi alterado de array JSON para entidade separada `SubcategoriaOcorrencia` com `@OneToMany`. Isso permite que cada subcategoria tenha seus próprios valores de severidade, SLA e flags de compliance.

```typescript
@Entity('categorias_ocorrencia')
export class CategoriaOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column()                       nome: string;
  @OneToMany(() => SubcategoriaOcorrencia, s => s.categoria, { cascade: true })
                                  subcategorias: SubcategoriaOcorrencia[];
  @Column({ type: 'tinyint' })    severidadePadrao: number;
  @Column()                       slaHoras: number;
  @Column({ default: false })     exigeNotifResponsavel: boolean;
  @Column({ default: false })     obrigatorioLegal: boolean;  // bloqueia opt-out
  @Column({ type: 'json' })       segmentosAplicaveis: Segmento[];
  @Column({ default: false })     exigeValidacao: boolean;
  @Column({ default: true })      ativo: boolean;
  @Column({ nullable: true, type: 'varchar' }) protocoloExterno: string | null;
}

@Entity('subcategorias_ocorrencia')
export class SubcategoriaOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' })       categoriaId: string;
  @Column()                       nome: string;
  @Column({ type: 'tinyint' })    severidadePadrao: number;
  @Column()                       slaHoras: number;
  @Column({ default: false })     exigeValidacao: boolean;
  @Column({ default: false })     exigeNotifResponsavel: boolean;
  @Column({ default: false })     obrigatorioLegal: boolean;
  @Column({ nullable: true, type: 'varchar' }) protocoloExterno: string | null;
  @Column({ default: true })      ativo: boolean;
  @CreateDateColumn()             criadoEm: Date;
  @ManyToOne(() => CategoriaOcorrencia, c => c.subcategorias)
                                  categoria: CategoriaOcorrencia;
}
```

### 5.6 Ocorrencia

```typescript
@Entity('ocorrencias')
export class Ocorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true })       codigo: string;   // OC-2026-00142-FM
  @ManyToOne(() => Aluno)         aluno: Aluno;
  @ManyToOne(() => Usuario)       registrador: Usuario;
  @ManyToOne(() => CategoriaOcorrencia) categoria: CategoriaOcorrencia;
  @Column({ nullable: true, type: 'varchar' })
                                  subcategoria: string | null;  // texto livre (legado)
  @ManyToOne(() => SubcategoriaOcorrencia, { nullable: true })
                                  subcategoriaRef: SubcategoriaOcorrencia | null;
  @Column({ nullable: true, type: 'varchar', length: 36 })
                                  subcategoriaId: string | null; // FK preferencial
  @Column({ type: 'tinyint' })    severidade: number;   // 1..5
  @Column({ type: 'date' })       dataIncidente: Date;
  @Column({ type: 'varchar', length: 200 })
                                  local: string;
  @Column({ type: 'text' })       descricao: string;
  @Column({ type: 'enum', enum: StatusOcorrencia, default: StatusOcorrencia.ABERTA })
                                  status: StatusOcorrencia;
  @Column({ type: 'enum', enum: CienciaFormalStatus, default: CienciaFormalStatus.PENDENTE })
                                  cienciaFormalStatus: CienciaFormalStatus;
  @Column({ nullable: true, type: 'datetime' }) dataResolucao: Date | null;
  @Column({ nullable: true, type: 'datetime' }) slaPrazo: Date | null;
  @CreateDateColumn()             criadoEm: Date;
  @UpdateDateColumn()             atualizadoEm: Date;
}
```

> **Nota sobre subcategoria:** O campo `subcategoria` (varchar) existe para compatibilidade com registros antigos. Novos registros devem usar `subcategoriaId` (FK para `SubcategoriaOcorrencia`). Os dois campos não são mutuamente exclusivos.

### 5.7 ValidacaoOcorrencia

```typescript
@Entity('validacoes_ocorrencia')
export class ValidacaoOcorrencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia)    ocorrencia: Ocorrencia;
  @ManyToOne(() => Usuario)       validador: Usuario;
  @Column({ type: 'enum', enum: TipoDecisao })
                                  tipoDecisao: TipoDecisao;  // VALIDAR|DEVOLVER|ESCALAR
  @Column({ type: 'varchar', length: 1000 })
                                  justificativa: string;     // mínimo 30 chars
  @Column({ type: 'datetime' })   dataDecisao: Date;
  @Column({ type: 'tinyint', nullable: true })
                                  severidadeAnterior: number | null;
  @Column({ type: 'tinyint', nullable: true })
                                  severidadeNova: number | null;
}
```

### 5.8 Encaminhamento

```typescript
@Entity('encaminhamentos')
export class Encaminhamento {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia)    ocorrencia: Ocorrencia;
  @Column()                       tipo: string;
  @ManyToOne(() => Usuario, { nullable: true })
                                  responsavel: Usuario | null;
  @Column({ type: 'date', nullable: true })
                                  prazo: Date | null;
  @Column({ type: 'text' })       descricao: string;
  @Column({ type: 'enum', enum: StatusEncaminhamento, default: StatusEncaminhamento.PENDENTE })
                                  status: StatusEncaminhamento;  // PENDENTE|EXECUTADO|VENCIDO
  @Column({ nullable: true, type: 'datetime' })
                                  dataExecucao: Date | null;
  @Column({ nullable: true, type: 'text' })
                                  resultadoRegistrado: string | null;
  @CreateDateColumn()             criadoEm: Date;
}
```

### 5.9 Evidencia

```typescript
@Entity('evidencias')
export class Evidencia {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia)    ocorrencia: Ocorrencia;
  @ManyToOne(() => Usuario)       enviadoPor: Usuario;
  @Column()                       nomeOriginal: string;
  @Column()                       s3Key: string;
  @Column()                       mimeType: string;          // validado via magic bytes
  @Column({ type: 'bigint' })     tamanhoBytes: number;
  @CreateDateColumn()             criadoEm: Date;
}
```

> Upload via S3 Pre-signed URL — o arquivo vai diretamente do browser ao S3, sem passar pelo NestJS (H-11).

### 5.10 Notificacao

```typescript
@Entity('notificacoes')
export class Notificacao {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia, { nullable: true })
                                  ocorrencia: Ocorrencia | null;
  @Column()                       destinatarioTipo: string;  // USUARIO | RESPONSAVEL
  @Column({ type: 'uuid' })       destinatarioId: string;
  @Column({ type: 'enum', enum: CanalNotificacao })
                                  canal: CanalNotificacao;   // EMAIL | IN_APP
  @Column()                       evento: string;            // ex: 'ocorrencia.criada'
  @Column({ type: 'enum', enum: StatusNotificacao, default: StatusNotificacao.PENDENTE })
                                  status: StatusNotificacao; // PENDENTE|ENVIADO|LIDO|FALHOU
  @Column({ nullable: true, type: 'datetime' }) dataEnvio: Date | null;
  @Column({ nullable: true, type: 'datetime' }) dataLeitura: Date | null;
  @CreateDateColumn()             criadoEm: Date;
}
```

### 5.11 CienciaFormal

```typescript
@Entity('ciencias_formais')
export class CienciaFormal {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Ocorrencia)    ocorrencia: Ocorrencia;
  @Column({ type: 'enum', enum: DestinatarioTipo })
                                  destinatarioTipo: DestinatarioTipo;  // ALUNO | RESPONSAVEL
  @Column({ type: 'uuid' })       destinatarioId: string;
  @Column({ type: 'varchar', length: 64 })
                                  tokenHash: string;    // SHA-256, uso único
  @Column({ type: 'varchar', length: 64 })
                                  hashConteudo: string; // SHA-256 do snapshot apresentado
  @Column({ type: 'datetime' })   dataEnvio: Date;
  @Column({ nullable: true, type: 'datetime' })
                                  dataConfirmacao: Date | null;  // preenchido = token inválido
  @Column({ nullable: true, type: 'varchar', length: 45 })
                                  ipConfirmacao: string | null;
  @Column({ nullable: true, type: 'text' })
                                  userAgent: string | null;
}
```

### 5.12 Auditoria (append-only)

```typescript
@Entity('auditorias')
export class Auditoria {
  @PrimaryGeneratedColumn('bigint') id: number;   // inteiro sequencial (performance)
  @Column({ nullable: true, type: 'varchar', length: 36 })
                                  ocorrenciaId: string | null;
  @Column({ type: 'uuid' })       atorId: string;
  @Column()                       perfilAtor: string;
  @Column()                       acao: string;              // ex: 'CREATE_OCORRENCIA'
  @Column()                       entidade: string;
  @Column()                       entidadeId: string;
  @Column({ nullable: true, type: 'json' })
                                  valorAnterior: object | null;
  @Column({ nullable: true, type: 'json' })
                                  valorNovo: object | null;
  @Column({ type: 'varchar', length: 45 }) ip: string;
  @Column({ type: 'datetime', precision: 6 }) timestamp: Date;
}
```

> Imutabilidade enforçada por triggers MySQL `BEFORE UPDATE` e `BEFORE DELETE` (H-04 + H-18).

### 5.13 Entidades de Autenticação ⚠️

> **Adição em relação à ERS v1.0:** Não previstas no documento original — necessárias para o fluxo Magic Link.

```typescript
@Entity('magic_link_tokens')
export class MagicLinkToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 64 }) tokenHash: string;  // SHA-256
  @Column({ type: 'uuid' })       usuarioId: string;
  @Column({ type: 'datetime' })   expiraEm: Date;               // +15 minutos
  @Column({ default: false })     usado: boolean;               // single-use
  @CreateDateColumn()             criadoEm: Date;
}

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 64 }) tokenHash: string;  // SHA-256
  @Column({ type: 'uuid' })       usuarioId: string;
  @Column({ type: 'datetime' })   expiraEm: Date;               // +7 dias
  @Column({ default: false })     revogado: boolean;
  @CreateDateColumn()             criadoEm: Date;
}
```

### 5.14 Tabela Auxiliar: codigo_sequencia

```sql
CREATE TABLE codigo_sequencia (
  ano        INT        NOT NULL,
  segmento   VARCHAR(2) NOT NULL,   -- FM | ME | SU
  ultimo_seq INT        NOT NULL DEFAULT 0,
  PRIMARY KEY (ano, segmento)
);
```

> Não é uma entidade TypeORM. Criada via migration SQL pura. Usada em `OcorrenciasService.gerarCodigo()` com `INSERT ... ON DUPLICATE KEY UPDATE` atômico (H-13, H-24).

---

## 6. Requisitos Funcionais

| ID | Nome | Prioridade | Status v1 |
|----|------|-----------|-----------|
| RF-01 | Autenticação + RBAC | Must Have | ✅ Entregue |
| RF-02 | Gestão de alunos com escopo | Must Have | ✅ Entregue |
| RF-03 | Registro de ocorrência | Must Have | ✅ Entregue |
| RF-04 | Workflow de validação por severidade | Must Have | ✅ Entregue |
| RF-05 | Encaminhamentos e plano de ação | Must Have | ✅ Entregue |
| RF-06 | Ciclo de vida e status da ocorrência | Must Have | ✅ Entregue |
| RF-07 | Gestão de evidências e anexos | Must Have | ✅ Entregue |
| RF-08 | Sistema de notificações | Must Have | ✅ Backend ✅ / Frontend 🔜 parcial |
| RF-09 | Dashboard e acompanhamento | Should Have | ✅ Entregue |
| RF-10 | Histórico e trilha de auditoria | Must Have | ✅ Backend ✅ / Frontend 🔜 parcial |
| RF-11 | Relatórios exportáveis (CSV) | Should Have | ✅ Entregue |
| RF-12 | Ciência formal do aluno/responsável | Should Have | ✅ Entregue |
| RF-13 | Alerta de reincidência | Should Have | ✅ Backend ✅ / Frontend 🔜 parcial |
| RF-14 | Gestão de usuários e perfis | Must Have | ✅ Entregue |
| RF-15 | Gestão de categorias e campus | Must Have | ✅ Entregue |
| RF-16 | Gestão de turmas | Must Have ⚠️ | ✅ Entregue (adicionado durante dev) |

> ⚠️ **RF-16 foi adicionado durante o desenvolvimento.** Não constava na ERS v1.0. A necessidade emergiu da implementação de RN-07 (professor só registra alunos de sua turma), que exigiu normalizar turmas como entidade própria com vínculo de professores.

### RF-01 — Autenticação + RBAC

**Descrição:** O sistema autentica usuários via Magic Link enviado por e-mail. Após login, o JWT carrega perfil, campus e segmentos do usuário. Todas as rotas são protegidas por `JwtAuthGuard` e `RolesGuard` globais.

**Fluxo:** `POST /auth/magic-link` → e-mail com link → `POST /auth/magic-link/verificar` → cookies HttpOnly (access + refresh).

**Perfis de acesso:** PROFESSOR, COORDENADOR, EQUIPE_PEDAGOGICA, DIRETOR, SECRETARIA, ADMIN.

### RF-02 — Gestão de Alunos com Escopo

**Descrição:** CRUD de alunos com escopo de visibilidade por campus (H-08). Autocomplete para seleção em formulários. Importação em lote via Excel.

**Endpoints:**
- `GET /alunos` — listagem paginada com filtros (escopo por campus/perfil)
- `GET /alunos/buscar?q=` — autocomplete (máx. 50 resultados)
- `GET /alunos/opcoes` — lista de campi e cursos distintos
- `GET /alunos/template` — download do template Excel para importação
- `POST /alunos` — cadastro (ADMIN e SECRETARIA)
- `POST /alunos/importar` — importação em lote via XLSX (ADMIN e SECRETARIA)
- `PATCH /alunos/:id` — atualização (ADMIN e SECRETARIA)
- `GET /alunos/:id` — detalhe (qualquer perfil autenticado)

### RF-03 — Registro de Ocorrência

**Descrição:** Qualquer perfil pedagógico (PROFESSOR, COORDENADOR, EQUIPE_PEDAGOGICA, DIRETOR) pode registrar ocorrências. O sistema valida regras de negócio (RN-01, RN-07, RN-11), gera código único e calcula SLA automaticamente.

**Código gerado:** formato `OC-AAAA-NNNNN-SS` onde SS = segmento (FM/ME/SU). Geração atômica via tabela `codigo_sequencia`.

**Status inicial:**
- Severidade < 4 → `ABERTA`
- Severidade ≥ 4 → `AGUARDANDO_VALIDACAO`

### RF-04 — Workflow de Validação por Severidade

**Descrição:** Ocorrências com severidade ≥ 4 exigem validação por COORDENADOR ou DIRETOR antes de produzir efeitos formais. DIRETOR ou ADMIN são obrigatórios para severidade 5.

**Decisões possíveis:**
- `VALIDAR` → ocorrência avança para `EM_ACOMPANHAMENTO`
- `DEVOLVER` → ocorrência retorna para `REVISAO` (registrador corrige)
- `ESCALAR` → ocorrência é redirecionada para nível superior

**RN-08:** COORDENADOR não pode validar ocorrência que ele mesmo registrou.

### RF-05 — Encaminhamentos e Plano de Ação

**Descrição:** Após validação, COORDENADOR, EQUIPE_PEDAGOGICA ou DIRETOR podem criar encaminhamentos vinculados à ocorrência, atribuir responsável, definir prazo e registrar resultado.

**Estados:** `PENDENTE` → `EXECUTADO`. `VENCIDO` aplicado automaticamente pelo SlaMonitorTask.

### RF-06 — Ciclo de Vida e Status da Ocorrência

**Descrição:** Máquina de estados com transições válidas. Transição inválida lança `BadRequestException`. Ocorrência `ARQUIVADA` é read-only (RN-12).

**Máquina de estados:**

```
ABERTA ──────────────────────────────────► EM_ACOMPANHAMENTO
ABERTA ──────────────────────────────────► AGUARDANDO_VALIDACAO
AGUARDANDO_VALIDACAO ────────────────────► EM_ACOMPANHAMENTO
AGUARDANDO_VALIDACAO ────────────────────► REVISAO
REVISAO ─────────────────────────────────► ABERTA
EM_ACOMPANHAMENTO ───────────────────────► RESOLVIDA
RESOLVIDA ───────────────────────────────► ARQUIVADA
RESOLVIDA ───────────────────────────────► EM_ACOMPANHAMENTO  (reabrir — apenas ADMIN + justificativa)
ARQUIVADA ───────────────────────────────► (nenhuma transição válida)
```

### RF-07 — Gestão de Evidências e Anexos

**Descrição:** Upload de arquivos diretamente ao S3 via pre-signed URL (o arquivo não passa pelo NestJS). Após upload, cliente confirma com o `s3Key`. O backend valida MIME via magic bytes.

**Tipos permitidos:** JPEG, PNG, PDF, MP4, DOCX (e outros configuráveis via `ALLOWED_MIMES`).
**Tamanho máximo:** 50 MB por arquivo.

### RF-08 — Sistema de Notificações

**Descrição:** Notificações disparadas por eventos de domínio (`@OnEvent`). Suporta EMAIL e IN_APP.

**Eventos notificados:**
- `ocorrencia.criada` → notifica responsável se menor + sev ≥ 3 (RN-05); sem notificação se sev ≥ 4 (aguarda validação, H-05)
- `ocorrencia.validada` → notifica registrador + responsável (se aplicável)

**Frontend:** listagem de notificações em `/notificacoes`. Integração WebSocket (in-app em tempo real) prevista para v1.1.

### RF-09 — Dashboard e Acompanhamento

**Descrição:** Resumo estatístico das ocorrências com escopo por perfil.

**Endpoints:**
- `GET /dashboard/resumo` → total, abertasSemana, resolvidasHoje, slasVencidas, porStatus
- `GET /dashboard/por-severidade` → contagem por severidade (1–5)

### RF-10 — Histórico e Trilha de Auditoria

**Descrição:** Toda operação crítica (criação, alteração de status, validação, login) é registrada na tabela `auditorias` com ator, IP, timestamp e valores anterior/posterior. A tabela é append-only (triggers MySQL impedem UPDATE e DELETE).

**Endpoints:**
- `GET /auditoria/ocorrencias/:ocorrenciaId`
- `GET /auditoria/usuarios/:usuarioId`
- `GET /auditoria/recentes`

### RF-11 — Relatórios Exportáveis

**Descrição:** Resumo estatístico agregado e exportação CSV das ocorrências. Menores sem ciência formal confirmada têm dados pseudonimizados na exportação (RN-10, LGPD).

**Campos exportados no CSV:** Código, Data Incidente, Aluno (ou `Aluno [UUID]` para menores s/ciência), Segmento, Campus, Categoria, Subcategoria, Severidade, Status, SLA Prazo, SLA Vencida, Data Resolução, Registrador, Registrado Em.

### RF-12 — Ciência Formal do Aluno/Responsável

**Descrição:** Geração de token SHA-256 single-use com TTL de 5 dias úteis. Responsável/aluno acessa página pública com o token, confirma e o sistema registra IP + User-Agent. Token não pode ser reusado após confirmação.

**Página pública:** `/ciencia/[token]` — acessível sem autenticação.

### RF-13 — Alerta de Reincidência

**Descrição:** Ao registrar uma ocorrência, o sistema verifica se o aluno tem ≥ 3 ocorrências da mesma categoria nos últimos 30 dias. Se sim, emite evento `reincidencia.detectada` e retorna flag na resposta.

**Endpoint:** `GET /ocorrencias/alunos/:alunoId/reincidencias` — retorna breakdown por categoria com flag `reincidente` por categoria.

### RF-14 — Gestão de Usuários e Perfis

**Descrição:** CRUD completo de usuários. Apenas ADMIN pode criar, atualizar perfil e desativar usuários. Gestão de turmas autorizadas por professor via `/usuarios/:id/turmas`.

### RF-15 — Gestão de Categorias e Campus

**Descrição:** ADMIN cria e gerencia categorias de ocorrência com subcategorias independentes (entidade separada com seus próprios valores de severidade, SLA e flags de compliance). Desativação lógica preserva histórico.

### RF-16 — Gestão de Turmas ⚠️ (Adicionado)

**Descrição:** ADMIN cria e gerencia turmas por campus, segmento, curso, ano letivo e turno. ADMIN vincula professores às turmas com papel (PROFESSOR ou COORDENADOR_TURMA).

**Endpoints:**
- `POST /turmas`, `GET /turmas`, `GET /turmas/:id`
- `PUT /usuarios/:id/turmas` — associar turmas a um professor

---

## 7. Regras de Negócio

| ID | Regra | Onde enforçado | Status v1 |
|----|-------|---------------|-----------|
| RN-01 | Ocorrência exige aluno com status `ATIVO` | `OcorrenciasService.criar()` | ✅ |
| RN-02 | Severidade ≥ 4 → status inicial `AGUARDANDO_VALIDACAO` | `OcorrenciasService.criar()` | ✅ |
| RN-03 | ≥ 3 ocorrências da mesma categoria em 30 dias → alerta reincidência | `OcorrenciasService.criar()` via evento | ✅ |
| RN-04 | Reabrir ocorrência `RESOLVIDA` exige perfil ADMIN + justificativa | `OcorrenciasService.alterarStatus()` | ✅ |
| RN-05 | Aluno menor de 18 anos + severidade ≥ 3 → notificação obrigatória ao responsável | `NotificacoesService` via `@OnEvent` | ✅ |
| RN-06 | Infrequência crítica (> 25% faltas) de menor → notificação ao Conselho Tutelar | `OcorrenciasService` | 🔜 v1.1 |
| RN-07 | Professor só registra ocorrência de aluno cuja turma está autorizada em `UsuarioTurma` | `OcorrenciasService.criar()` | ✅ |
| RN-08 | COORDENADOR não pode validar ocorrência que ele mesmo registrou | `ValidacoesService.validar()` | ✅ |
| RN-09 | Ocorrências de Saúde/Bem-estar com risco à integridade: acesso restrito por perfil | `OcorrenciasService.buscarPorId()` | ✅ |
| RN-10 | Menor sem ciência formal confirmada: dados pseudonimizados em exportações | `RelatoriosService.exportarCsv()` | ✅ |
| RN-11 | Data de incidente retroativa > 90 dias exige `aprovacaoRetroativaDiretor: true` e perfil DIRETOR ou ADMIN | `OcorrenciasService.criar()` | ✅ |
| RN-12 | Ocorrência `ARQUIVADA` é imutável (read-only) | `OcorrenciasService.alterarStatus()` | ✅ |
| RN-13 | Aluno do Ensino Superior tem direito de adicionar contrarrazões após validação | `ComentariosService` (módulo não implementado) | 🔜 v1.1 |
| RN-14 | Plágio ou fraude no Superior → instauração de Comissão Disciplinar em ≤ 10 dias úteis | `EncaminhamentosService` (automação não implementada) | 🔜 v1.1 |
| RN-15 | Severidade 5 → validação exige perfil DIRETOR ou ADMIN (não basta COORDENADOR) | `ValidacoesService.validar()` | ✅ |
| RN-16 | Notificação ao responsável para Sev ≥ 4 é diferida até após validação (não na criação) | `NotificacoesService` via H-05 | ✅ |
| RN-17 | Matrícula de aluno deve ser única no sistema | `AlunosService.criar()` via `ConflictException` | ✅ |

> ⚠️ **RN-15 e RN-16** são novas regras identificadas e implementadas durante o desenvolvimento. Não constavam explicitamente na ERS v1.0.
> ⚠️ **RN-17** foi adicionado após bug reportado (HTTP 500 em matrícula duplicada → corrigido para HTTP 409).

---

## 8. RBAC — Matriz de Permissões

### 8.1 Perfis de Usuário

| Enum | Descrição |
|------|-----------|
| `PROFESSOR` | Registra ocorrências dos alunos de suas turmas autorizadas |
| `COORDENADOR` | Valida ocorrências, gerencia encaminhamentos e alunos do seu campus |
| `EQUIPE_PEDAGOGICA` | Registra ocorrências, cria encaminhamentos |
| `DIRETOR` | Visão completa, valida qualquer ocorrência incluindo Sev 5 |
| `SECRETARIA` | Gerencia alunos e responsáveis; não registra ocorrências |
| `ADMIN` | Gestão total do sistema; não registra ocorrências |

### 8.2 Tabela de Capacidades

| Capacidade | Prof. | Coord. | Eq.Ped. | Diretor | Secret. | Admin |
|-----------|:-----:|:------:|:-------:|:-------:|:-------:|:-----:|
| Registrar ocorrência | ✅¹ | ✅ | ✅ | ✅ | — | — |
| Validar ocorrência (Sev 1–4) | — | ✅² | — | ✅ | — | — |
| Validar ocorrência (Sev 5) | — | — | — | ✅ | — | ✅ |
| Criar encaminhamento | — | ✅ | ✅ | ✅ | — | — |
| Alterar status (exceto reabrir) | — | ✅ | — | ✅ | — | ✅ |
| Reabrir ocorrência RESOLVIDA | — | — | — | — | — | ✅ |
| Listar ocorrências (escopo) | Próprias | Campus | Campus | Todas | — | Todas |
| Cadastrar/editar aluno | — | — | — | — | ✅ | ✅ |
| Listar alunos (escopo) | Campus | Campus | Campus | Todas | Campus | Todas |
| Gerir usuários | — | — | — | — | — | ✅ |
| Gerir categorias | — | — | — | — | — | ✅ |
| Gerir turmas | — | — | — | — | — | ✅ |
| Exportar relatórios | — | ✅ | — | ✅ | ✅ | ✅ |
| Verificar reincidências | — | ✅ | ✅ | ✅ | — | ✅ |
| Dashboard | Não | Parcial | — | ✅ | — | ✅ |

> ¹ PROFESSOR: apenas alunos de turmas autorizadas (RN-07)
> ² COORDENADOR: não pode validar ocorrência que ele mesmo registrou (RN-08)

### 8.3 Escopo de Dados (H-08)

O escopo de dados é aplicado nos Services — nunca nos Controllers:

| Perfil | Escopo em ocorrências | Escopo em alunos |
|--------|----------------------|-----------------|
| PROFESSOR | Apenas as que registrou | Campus do usuário |
| COORDENADOR | Campus do usuário | Campus do usuário |
| EQUIPE_PEDAGOGICA | Campus do usuário | Campus do usuário |
| SECRETARIA | Sem acesso a ocorrências | Campus do usuário |
| DIRETOR | Todos os campi | Todos os campi |
| ADMIN | Todos os campi | Todos os campi |

---

## 9. Taxonomia de Ocorrências e SLA

### 9.1 Severidade e SLA

| Nível | Descrição | SLA | Ações Obrigatórias |
|-------|-----------|-----|-------------------|
| 1 — Informativa | Registro histórico | 5 dias úteis | Nenhuma |
| 2 — Leve | Acompanhamento pedagógico | 3 dias úteis | Comentário do coordenador |
| 3 — Moderada | Ação formal + notificação | 2 dias úteis | Notif. responsável (menor) + encaminhamento |
| 4 — Grave | Impacto disciplinar | 24 horas corridas | Validação coord. + notif. responsável |
| 5 — Gravíssima | Risco à integridade | 4 horas corridas | Validação diretoria + notif. imediata |

> **Dias úteis:** calculados via `date-fns/addBusinessDays` (finais de semana excluídos). Feriados nacionais **não** são considerados nesta versão — previsto para v1.1.
> **Horas corridas:** calculadas via `date-fns/addHours` (sem desconto de períodos).

### 9.2 Alertas de SLA

- 75% do prazo decorrido → notificação in-app ao responsável pelo workflow
- 100% (vencimento) → escalamento + registro em auditoria
- `SlaMonitorTask` executa a cada 15 minutos via `@Cron('*/15 * * * *')`

### 9.3 Categorias do Sistema (Seed Padrão)

Baseadas no Manual do Discente da instituição. Estrutura: Categoria → Subcategorias (entidades independentes).

| Categoria | Subcategorias (exemplos) | Conselho Tutelar |
|-----------|--------------------------|:----------------:|
| Disciplinar | Agressão física, Bullying, Cyberbullying, Porte de objeto perigoso | ✅ (ECA art. 13) |
| Acadêmica | Plágio, Desonestidade acadêmica, Infrequência crítica | 🔜 Infrequência (ECA art. 56) |
| Comportamental | Uso de substâncias, Intimidação | — |
| Saúde/Bem-estar | Automutilação, Suspeita de violência doméstica | ✅ Urgente |
| Administrativa | Dano ao patrimônio, Uso indevido de espaços | — |

---

## 10. Ciclo de Vida da Ocorrência

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REGISTRO                                     │
│  Qualquer perfil pedagógico (exceto SECRETARIA e ADMIN)             │
│  Sev 1–3 → ABERTA                                                   │
│  Sev 4–5 → AGUARDANDO_VALIDACAO                                     │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                  ▼
         [Sev 1-3]        [Sev 4-5]          [Sev 4-5]
           ABERTA    AGUARDANDO_VALIDACAO      REVISAO
              │               │                  │
              │    ┌──────────┼──────────┐        │
              │    ▼          ▼          ▼        │
              │  VALIDAR   DEVOLVER   ESCALAR     │
              │    │          │          │        │
              │    │          └──────────┘        │
              │    │             REVISAO ──────────┘
              ▼    ▼
        EM_ACOMPANHAMENTO
              │
              ▼
           RESOLVIDA ──── (ADMIN) ──► EM_ACOMPANHAMENTO
              │
              ▼
           ARQUIVADA  ←── read-only (RN-12)
```

---

## 11. APIs Implementadas

### Prefixo global: `/api/v1`

| Módulo | Método | Rota | Roles | Descrição |
|--------|--------|------|-------|-----------|
| **Auth** | POST | /auth/magic-link | público | Solicitar link de acesso |
| | POST | /auth/magic-link/verificar | público | Verificar token e emitir cookies |
| | POST | /auth/refresh | autenticado | Renovar tokens |
| | POST | /auth/logout | autenticado | Encerrar sessão |
| | GET | /auth/me | autenticado | Dados do usuário logado |
| | GET | /auth/csrf-token | público | Obter CSRF token |
| | POST | /auth/dev-login | DEV only | Login sem e-mail (dev) |
| **Alunos** | GET | /alunos | autenticado | Listar paginado com escopo |
| | POST | /alunos | ADMIN, SECRETARIA | Cadastrar aluno |
| | GET | /alunos/buscar | autenticado | Autocomplete (máx. 50) |
| | GET | /alunos/opcoes | autenticado | Campi e cursos distintos |
| | GET | /alunos/template | ADMIN, SECRETARIA | Template Excel |
| | POST | /alunos/importar | ADMIN, SECRETARIA | Importação em lote |
| | GET | /alunos/:id | autenticado | Detalhe do aluno |
| | PATCH | /alunos/:id | ADMIN, SECRETARIA | Atualizar aluno |
| **Responsáveis** | POST | /responsaveis | ADMIN, SECRETARIA, COORDENADOR | Criar/vincular responsável |
| | POST | /responsaveis/:id/vincular | ADMIN, SECRETARIA, COORDENADOR | Vincular a aluno |
| | GET | /responsaveis/aluno/:alunoId | autenticado | Responsáveis do aluno |
| | GET | /responsaveis/:id | autenticado | Detalhe |
| | PATCH | /responsaveis/:id | ADMIN, SECRETARIA | Atualizar dados pessoais |
| | PATCH | /responsaveis/:id/vinculos/:alunoId | ADMIN, SECRETARIA | Atualizar vínculo |
| | DELETE | /responsaveis/:id/vinculos/:alunoId | ADMIN, SECRETARIA | Remover vínculo |
| **Ocorrências** | POST | /ocorrencias | PROF, COORD, EQ_PED, DIRETOR | Registrar |
| | GET | /ocorrencias | autenticado | Listar com escopo |
| | GET | /ocorrencias/:id | autenticado | Detalhe |
| | PATCH | /ocorrencias/:id/status | COORD, DIRETOR, ADMIN | Alterar status |
| | GET | /ocorrencias/alunos/:alunoId/reincidencias | COORD, EQ_PED, DIRETOR, ADMIN | Verificar reincidência |
| **Validações** | POST | /ocorrencias/:id/validacoes | COORD, DIRETOR, ADMIN | Registrar decisão |
| | GET | /ocorrencias/:id/validacoes | autenticado | Histórico de validações |
| **Encaminhamentos** | POST | /ocorrencias/:id/encaminhamentos | COORD, EQ_PED, DIRETOR | Criar encaminhamento |
| | GET | /ocorrencias/:id/encaminhamentos | autenticado | Listar |
| | PATCH | /encaminhamentos/:id/resultado | COORD, EQ_PED, DIRETOR, ADMIN | Registrar resultado |
| **Evidências** | POST | /evidencias/presigned-url | autenticado | Obter URL para upload S3 |
| | POST | /evidencias/confirmar | autenticado | Confirmar upload |
| | GET | /evidencias/ocorrencia/:id | autenticado | Listar evidências |
| | DELETE | /evidencias/:id | ADMIN | Remover evidência |
| **Categorias** | POST | /categorias | ADMIN | Criar categoria |
| | GET | /categorias | autenticado | Listar ativas |
| | GET | /categorias/:id | autenticado | Detalhe com subcategorias |
| | DELETE | /categorias/:id | ADMIN | Desativar |
| | POST | /categorias/:id/subcategorias | ADMIN | Adicionar subcategoria |
| | GET | /categorias/:id/subcategorias | autenticado | Listar subcategorias |
| | PATCH | /categorias/:id/subcategorias/:subId | ADMIN | Atualizar subcategoria |
| | DELETE | /categorias/:id/subcategorias/:subId | ADMIN | Desativar subcategoria |
| **Turmas** | POST | /turmas | ADMIN | Criar turma |
| | GET | /turmas | autenticado | Listar |
| | GET | /turmas/:id | autenticado | Detalhe |
| **Usuários** | POST | /usuarios | ADMIN | Criar usuário |
| | GET | /usuarios | ADMIN | Listar |
| | GET | /usuarios/:id | ADMIN | Detalhe |
| | GET | /usuarios/:id/turmas | ADMIN | Turmas do professor |
| | PUT | /usuarios/:id/turmas | ADMIN | Associar turmas |
| | PATCH | /usuarios/:id/perfil | ADMIN | Alterar perfil/campus |
| | DELETE | /usuarios/:id | ADMIN | Desativar |
| **Notificações** | GET | /notificacoes | autenticado | Listar minhas notificações |
| | PATCH | /notificacoes/:id/lida | autenticado | Marcar como lida |
| **Dashboard** | GET | /dashboard/resumo | autenticado | Estatísticas gerais |
| | GET | /dashboard/por-severidade | autenticado | Distribuição por severidade |
| **Auditoria** | GET | /auditoria/ocorrencias/:id | COORD, DIRETOR, ADMIN | Trilha da ocorrência |
| | GET | /auditoria/usuarios/:id | ADMIN | Ações do usuário |
| | GET | /auditoria/recentes | ADMIN | Eventos recentes |
| **Relatórios** | GET | /relatorios/resumo | COORD, DIRETOR, SECRET, ADMIN | Resumo agregado |
| | GET | /relatorios/exportar | COORD, DIRETOR, SECRET, ADMIN | Exportar CSV |
| **Ciência Formal** | GET | /ciencia/:token | público | Ver documento de ciência |
| | POST | /ciencia/:token/confirmar | público | Confirmar ciência |

---

## 12. Conformidade Legal

### 12.1 ECA — Estatuto da Criança e do Adolescente

| Obrigação | Implementação | Status |
|-----------|--------------|--------|
| Notificação ao responsável para menores (art. 18) | RN-05 via `NotificacoesService` | ✅ |
| Notificação ao Conselho Tutelar por infrequência > 25% (art. 56) | RN-06 | 🔜 v1.1 |
| Notificação ao Conselho Tutelar por maus-tratos / violência (art. 13) | Categoria com `protocoloExterno = 'CONSELHO_TUTELAR'` | ✅ Estrutura |
| Retenção de dados até maioridade + 5 anos | Política de retenção via status ARQUIVADA | 🔜 Política automática v1.1 |

### 12.2 LGPD — Lei Geral de Proteção de Dados

| Obrigação | Implementação | Status |
|-----------|--------------|--------|
| Dados de menores — pseudonimização em relatórios analíticos (art. 13) | `RelatoriosService.exportarCsv()` — RN-10 | ✅ |
| Ciência formal do titular | `CienciaFormalModule` com token SHA-256 single-use | ✅ |
| Trilha de auditoria para acesso a dados sensíveis | `AuditInterceptor` global | ✅ |
| CPF armazenado criptografado [enc] | `cpfEncriptado` previsto em entidades | 🔜 v1.1 |
| DSAR — Direito do titular em 15 dias úteis | Sem endpoint específico | 🔜 v1.1 |
| Consentimento para notificações | `AlunoResponsavel.receberNotificacoes` | ✅ |

---

## 13. Decisões Arquiteturais

> Esta seção documenta todas as decisões tomadas durante o desenvolvimento que divergem da ERS v1.0 ou que não estavam previstas no documento original.

### DA-01: Magic Link em vez de SSO Azure AD

**Contexto:** A ERS v1.0 especificava SSO obrigatório via Azure AD ou Google OAuth.

**Decisão:** Implementar Magic Link com e-mail institucional como mecanismo de autenticação.

**Motivação:** Elimina dependência de configuração de tenant Azure AD para desenvolvimento e testes. O fluxo de Magic Link oferece segurança equivalente para o contexto de uso (e-mail institucional verificado). A estrutura do JWT payload permanece compatível com SSO se a migração for necessária no futuro.

**Impacto:** Variáveis `SSO_CLAIM_PERFIL`, `SSO_CLAIM_CAMPUS` e `SSO_CLAIM_SEGMENTO` removidas do `.env`. Adicionadas `SMTP_*` para envio de e-mail.

---

### DA-02: Subcategorias como Entidade Separada

**Contexto:** ERS v1.0 planejava `subcategorias` como array JSON dentro de `CategoriaOcorrencia`.

**Decisão:** Criar entidade `SubcategoriaOcorrencia` com relacionamento `@OneToMany`.

**Motivação:** Subcategorias precisam de seus próprios valores de severidade, SLA, flags de compliance (`obrigatorioLegal`, `exigeNotifResponsavel`) e `protocoloExterno`. Armazenar como JSON tornaria essas regras impossíveis de enforçar no banco.

**Impacto:** Nova tabela `subcategorias_ocorrencia`. Campo `subcategoriaId` (FK) na `Ocorrencia`. Campo `subcategoria` (varchar) mantido para compatibilidade.

---

### DA-03: Modelo M:N para Responsáveis

**Contexto:** ERS v1.0 previa `ResponsavelLegal` com relacionamento `@ManyToOne → Aluno` (1 responsável por aluno).

**Decisão:** Normalizar para `Responsavel` + `AlunoResponsavel` (M:N com deduplicação por e-mail).

**Motivação:** Irmãos compartilham o mesmo responsável. O modelo anterior exigiria duplicar o cadastro do responsável para cada filho. O modelo M:N elimina a duplicação e garante consistência (um e-mail = um cadastro).

**Impacto:** Renomeação de `ResponsavelLegal` para `Responsavel`. Nova tabela `aluno_responsavel` com `parentesco` e `receberNotificacoes`.

---

### DA-04: Entidade Turma com UsuarioTurma

**Contexto:** ERS v1.0 não previa `Turma` como entidade — apenas campo `turma: string` no `Aluno`.

**Decisão:** Criar entidade `Turma` + `UsuarioTurma` para suportar RN-07.

**Motivação:** RN-07 exige que o sistema verifique se um professor está autorizado a registrar ocorrências de alunos de determinada turma. Isso requer uma tabela de relação entre `Usuario` e `Turma`.

**Impacto:** Novas tabelas `turmas` e `usuario_turmas`. Campo `turma` no `Aluno` permanece como string (nome) para preservar histórico. A relação para RN-07 é resolvida por nome+campus, não por FK.

---

### DA-05: HttpOnly Cookies em vez de Bearer Token no Header

**Contexto:** A maioria das implementações NestJS + Next.js usa `Authorization: Bearer <token>`.

**Decisão:** Tokens entregues como cookies HttpOnly com CSRF double-submit.

**Motivação:** Cookies HttpOnly não são acessíveis por JavaScript — protegem contra XSS. Bearer tokens no `localStorage` são vulneráveis a XSS. A combinação HttpOnly + CSRF cobre os dois vetores principais.

**Impacto:** Frontend deve incluir o header `X-CSRF-Token` em todas as mutações. Cookies requerem `credentials: 'include'` nas chamadas `fetch`.

---

### DA-06: Relatórios Sob Demanda (Sem Persistência)

**Contexto:** ERS v1.0 mencionava possibilidade de agendamento para relatórios.

**Decisão:** Relatórios gerados apenas sob demanda, sem persistência no banco ou S3.

**Motivação:** YAGNI — o MVP não requer relatórios agendados. A complexidade de um sistema de agendamento de relatórios não justifica o custo para v1.

**Impacto:** Relatórios CSV são gerados em memória e entregues diretamente na resposta HTTP.

---

### DA-07: Eventos de Domínio via @nestjs/event-emitter

**Contexto:** ERS v1.0 descrevia chamadas diretas entre services para notificações.

**Decisão:** Usar `@nestjs/event-emitter` para desacoplar o módulo de ocorrências do módulo de notificações.

**Motivação:** `OcorrenciasService` não deve conhecer `NotificacoesService`. O acoplamento via eventos permite que múltiplos handlers reajam ao mesmo evento (notificações, SLA, auditoria) sem modificar `OcorrenciasService`.

**Impacto:** Eventos publicados: `ocorrencia.criada`, `ocorrencia.validada`, `reincidencia.detectada`. Handlers envolvidos em `try/catch` para não propagar falhas de notificação para o fluxo principal.

---

## 14. Escopo da v1 — Entregue e Pendente

### Entregue na v1

| Área | Resumo |
|------|--------|
| Autenticação | Magic Link + JWT + HttpOnly cookies + CSRF + rate limiting |
| Gestão de alunos | CRUD + importação Excel + busca com escopo (H-08) |
| Gestão de responsáveis | Modelo M:N com deduplicação por e-mail |
| Gestão de turmas | Entidade + vínculo professor-turma (RN-07) |
| Gestão de categorias | Hierarquia Categoria → Subcategoria (entidades independentes) |
| Gestão de usuários | CRUD + perfis + turmas autorizadas |
| Ocorrências | Registro + ciclo de vida + máquina de estados |
| Validações | Workflow tripartite (VALIDAR/DEVOLVER/ESCALAR) + RN-08 + RN-15 |
| Encaminhamentos | Criação + registro de resultado |
| Evidências | Upload via S3 presigned URLs + validação magic bytes |
| Notificações | EMAIL + IN_APP via eventos de domínio |
| Dashboard | Estatísticas com escopo por perfil |
| Auditoria | Trilha append-only com triggers MySQL |
| Relatórios | Resumo + exportação CSV com pseudonimização (RN-10) |
| Ciência formal | Token single-use + página pública + rastreamento de IP |
| Alerta de reincidência | Backend completo; frontend parcial |
| SLA | Cálculo + armazenamento + monitoramento por cron task |
| Testes | 329 unitários (31 suites) + 78 E2E (5 suites) |

### Pendente para v1.1

| Item | Motivo do adiamento |
|------|-------------------|
| RN-06: infrequência → Conselho Tutelar | Complexidade de integração externa |
| RN-13: contrarrazões do aluno (Superior) | Módulo `Comentarios` não implementado |
| RN-14: Comissão Disciplinar (plágio) | Fluxo colegiado de alta complexidade |
| CPF criptografado `[enc]` | Requer `CryptoService` + rotação de chaves |
| DSAR (direito do titular LGPD) | Requer endpoint e processo de resposta |
| Feriados nacionais no cálculo de SLA | Tabela de feriados + `date-fns-business-days` |
| Notificações WebSocket (in-app real-time) | Gateway Socket.io não integrado ao frontend |
| Testes E2E Playwright (frontend) | Ambiente de staging necessário |
| Relatórios agendados | Somente sob demanda na v1 |
| Política automática de retenção de dados | Cron task + política de arquivo |

### Fora de Escopo (Won't Have)

- Integração com sistema acadêmico externo (ERP/SIS)
- Portal mobile nativo para responsáveis
- Análise preditiva de evasão
- Assinatura digital ICP-Brasil
- Integração direta com Conselho Tutelar via API
- Multi-tenancy (múltiplas instituições)

---

## 15. Histórico de Alterações

| Versão | Data | Alteração |
|--------|------|-----------|
| 1.0 | Abril/2026 | ERS original (`ERS_SGOA_v1.0.docx`) — baseline de requisitos |
| 2.0 | Maio/2026 | Este documento — gerado a partir do código implementado |

### Alterações da v1.0 para v2.0

| # | Seção | Tipo | Descrição |
|---|-------|------|-----------|
| 1 | §2 | Alteração | Sistema renomeado de SGOA para **Radar Acadêmico** (sigla técnica mantida) |
| 2 | §4 | Alteração | Autenticação alterada de **SSO Azure AD** para **Magic Link** |
| 3 | §4 | Adição | Fluxo de **HttpOnly cookies + CSRF double-submit** |
| 4 | §4 | Adição | Entidades `MagicLinkToken` e `RefreshToken` |
| 5 | §5.3 | Alteração | `ResponsavelLegal` → modelo **M:N** (`Responsavel` + `AlunoResponsavel`) |
| 6 | §5.4 | Adição | Entidade **`Turma`** + **`UsuarioTurma`** (não prevista na ERS v1.0) |
| 7 | §5.5 | Alteração | `subcategorias: JSON` → **`SubcategoriaOcorrencia` como entidade separada** |
| 8 | §5.6 | Adição | Campo `cienciaFormalStatus` na `Ocorrencia` (enum próprio) |
| 9 | §5.6 | Adição | Campo `subcategoriaId` (FK) além do varchar `subcategoria` |
| 10 | §6 | Adição | **RF-16: Gestão de Turmas** (emergiu da implementação de RN-07) |
| 11 | §7 | Adição | **RN-15:** Sev 5 exige DIRETOR ou ADMIN (não apenas COORDENADOR) |
| 12 | §7 | Adição | **RN-16:** Notificação para Sev ≥ 4 diferida até pós-validação |
| 13 | §7 | Adição | **RN-17:** Matrícula duplicada retorna HTTP 409 (antes retornava 500) |
| 14 | §7 | Adiamento | **RN-06** (infrequência → Conselho Tutelar) → v1.1 |
| 15 | §7 | Adiamento | **RN-13** (contrarrazões Superior) → v1.1 |
| 16 | §7 | Adiamento | **RN-14** (Comissão Disciplinar) → v1.1 |
| 17 | §13 | Adição | Decisões arquiteturais DA-01 a DA-07 documentadas |

---

*ERS Radar Acadêmico v2.0 — Gerado a partir de auditoria de código-fonte e histórico Git em Maio/2026*
*Stack: Next.js 16 (frontend) + NestJS 10 (backend) + MySQL 8.0*
*329 testes unitários + 78 testes E2E passando no momento desta versão*
