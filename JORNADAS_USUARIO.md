# SGOA — Jornadas de Usuário por Perfil

> **Documento gerado em:** Maio/2026  
> **Versão do sistema:** SGOA v1.0  
> **Referência normativa:** ERS_SGOA_v1.0 — §7 Regras de Negócio, §11 RBAC, §12 Segmento  
>
> Este documento descreve, para cada perfil de usuário do SGOA, quais ações são **permitidas**
> e quais são **negadas**, com as respectivas regras de negócio e o status HTTP devolvido pela API.
> Cada jornada foi implementada com cobertura de testes (unitários e/ou E2E).

---

## Índice

1. [PROFESSOR](#1-professor)
2. [COORDENADOR](#2-coordenador)
3. [EQUIPE PEDAGÓGICA](#3-equipe-pedagógica)
4. [DIRETOR](#4-diretor)
5. [SECRETARIA](#5-secretaria)
6. [ADMIN](#6-admin)
7. [ALUNO](#7-aluno-perfil-externo)
8. [RESPONSÁVEL LEGAL](#8-responsável-legal-perfil-externo)
9. [Usuário não autenticado](#9-usuário-não-autenticado)
10. [Matriz resumida](#10-matriz-resumida)

---

## 1. PROFESSOR

> **Papel:** registrar ocorrências das turmas às quais está vinculado.  
> **Escopo natural:** Campus A, turmas atribuídas via `UsuarioTurma`.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Registrar ocorrência de aluno da própria turma | `POST /ocorrencias` | RN-07: precisa ter vínculo ativo `UsuarioTurma` com a turma do aluno | E2E `ocorrencias` — `201 professor registra` |
| Listar próprias ocorrências | `GET /ocorrencias` | H-08: só vê as que registrou | E2E `ocorrencias` — `professor vê suas próprias` |
| Visualizar ocorrência que registrou | `GET /ocorrencias/:id` | H-08 / C-02 | E2E `ocorrencias` — `200 professor visualiza` |
| Listar validações de uma ocorrência | `GET /ocorrencias/:id/validacoes` | Sem restrição de perfil na listagem | E2E `validacoes` — `professor lista validações` |
| Listar encaminhamentos | `GET /ocorrencias/:id/encaminhamentos` | Sem restrição | — |
| Gerar URL de upload de evidência | `POST /evidencias/presigned-url` | Professor está no `@Roles` do controller | Unit `evidencias` |
| Confirmar upload de evidência | `POST /evidencias/confirmar` | Idem | Unit `evidencias` |
| Remover evidência que ele mesmo enviou | `DELETE /evidencias/:id` | Service verifica `enviadoPorId === usuario.sub` | Unit `evidencias` — `uploader remove própria` |
| Listar evidências de uma ocorrência | `GET /evidencias/ocorrencia/:id` | — | — |
| Listar notificações recebidas | `GET /notificacoes` | Filtrado por `currentUser.sub` | — |
| Marcar notificação como lida | `PATCH /notificacoes/:id/lida` | Idem | — |
| Listar alunos (campus-scoped) | `GET /alunos` | Retorna apenas alunos do seu campus | E2E `alunos` — `professor lista alunos` |
| Buscar aluno por matrícula/nome | `GET /alunos/buscar?q=` | Campus-scoped | E2E `alunos` — `buscar` |
| Visualizar aluno por ID | `GET /alunos/:id` | Sem restrição de perfil | E2E `alunos` — `GET por ID` |
| Listar categorias | `GET /categorias` | Sem restrição | — |
| Listar turmas | `GET /turmas` | Sem restrição | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| Registrar ocorrência de aluno de turma não vinculada | `POST /ocorrencias` | RN-07: `UsuarioTurma.find()` retorna `[]` | 403 | Unit `ocorrencias` — `turma não vinculada` |
| Registrar ocorrência de aluno de outro campus | `POST /ocorrencias` | RN-07: campus do aluno ≠ turma do professor | 403 | Unit `ocorrencias` — `outro campus` |
| Visualizar ocorrência de outro registrador | `GET /ocorrencias/:id` | H-08 / C-02: `registradorId ≠ usuario.sub` | 403 | Unit `buscarPorId` — `não pode ver de outro` |
| Alterar status de uma ocorrência | `PATCH /ocorrencias/:id/status` | Guard `@Roles`: PROFESSOR não está na lista | 403 | E2E `ocorrencias` — `403 professor altera status` |
| Validar ocorrência | `POST /ocorrencias/:id/validacoes` | Guard `@Roles`: apenas COORDENADOR, DIRETOR, ADMIN | 403 | E2E `validacoes` — `403 professor` |
| Verificar reincidências de aluno | `GET /ocorrencias/alunos/:id/reincidencias` | Guard `@Roles`: apenas COORDENADOR, EQUIPE_PEDAGOGICA, DIRETOR, ADMIN | 403 | E2E `ocorrencias` — `403 professor reincidências` |
| Criar encaminhamento | `POST /ocorrencias/:id/encaminhamentos` | Guard `@Roles` | 403 | — |
| Criar aluno | `POST /alunos` | Guard `@Roles`: apenas ADMIN e SECRETARIA | 403 | E2E `alunos` — `403 professor cria aluno` |
| Atualizar dados do aluno | `PATCH /alunos/:id` | Guard `@Roles`: apenas ADMIN e SECRETARIA | 403 | E2E `alunos` — `403 professor atualiza` |
| Remover evidência de outro usuário | `DELETE /evidencias/:id` | Service: `enviadoPorId ≠ sub` e perfil sem privilégio | 403 | Unit `evidencias` — `professor remove de outro` |
| Acessar auditoria | `GET /auditoria/*` | Guard `@Roles`: apenas DIRETOR e ADMIN | 403 | — |
| Acessar relatórios | `GET /relatorios/*` | Guard `@Roles`: COORDENADOR, EQUIPE_PEDAGOGICA, DIRETOR, SECRETARIA, ADMIN | 403 | — |
| Criar/alterar categorias | `POST/DELETE /categorias` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar/alterar usuários | `POST/PATCH /usuarios` | Guard `@Roles`: apenas ADMIN | 403 | — |

---

## 2. COORDENADOR

> **Papel:** validar, acompanhar e encaminhar ocorrências do seu campus.  
> **Escopo natural:** campus ao qual está vinculado.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Registrar ocorrência | `POST /ocorrencias` | Sem restrição de turma (ao contrário do professor) | E2E `ocorrencias` — `sev≥4 → AGUARDANDO_VALIDACAO` |
| Listar ocorrências do seu campus | `GET /ocorrencias` | H-08: `aluno.campus = usuario.campus` | E2E + Unit `listar` — `coordenador campus` |
| Visualizar ocorrência do seu campus | `GET /ocorrencias/:id` | H-08 / C-02 | E2E `ocorrencias` — `200 coordenador visualiza` |
| Validar ocorrência de outro registrador (sev ≤ 4) | `POST /ocorrencias/:id/validacoes` | RN-08: não pode ser o próprio registrador | E2E `validacoes` — `201 coordenador valida` |
| Devolver/escalar ocorrência | `POST /ocorrencias/:id/validacoes` | Decisões DEVOLVER e ESCALAR | E2E `validacoes` — `DEVOLVER`, `ESCALAR` |
| Alterar status da ocorrência | `PATCH /ocorrencias/:id/status` | Transições válidas segundo P-03 | E2E `ocorrencias` — `ABERTA → EM_ACOMPANHAMENTO` |
| Criar encaminhamento | `POST /ocorrencias/:id/encaminhamentos` | — | — |
| Registrar resultado de encaminhamento | `PATCH /ocorrencias/:id/encaminhamentos/:id/resultado` | — | — |
| Verificar reincidências de aluno do próprio campus | `GET /ocorrencias/alunos/:id/reincidencias` | C-01: `aluno.campus = usuario.campus` | E2E + Unit `reincidências` — `coordenador mesmo campus` |
| Remover evidência de qualquer usuário | `DELETE /evidencias/:id` | Service: COORDENADOR está na lista de perfis autorizados | Unit `evidencias` — `coordenador remove de outro` |
| Criar/vincular responsável | `POST /responsaveis` | Guard inclui COORDENADOR | — |
| Exportar relatórios | `GET /relatorios/exportar` | Guard inclui COORDENADOR | — |
| Resumo do dashboard (campus-scoped) | `GET /dashboard/resumo` | Sem `@Roles`, retorno filtrado por campus | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| Visualizar ocorrência de outro campus | `GET /ocorrencias/:id` | H-08 / C-02: `aluno.campus ≠ usuario.campus` | 403 | E2E `ocorrencias` — `C-02 coordenador B → 403` |
| Listar ocorrências de outro campus | `GET /ocorrencias` | H-08: campus B não vê campus A | 200 lista vazia | E2E `ocorrencias` — `H-08 Campus B vazio` |
| Verificar reincidências de aluno de outro campus | `GET /ocorrencias/alunos/:id/reincidencias` | C-01 | 403 | E2E + Unit `reincidências` — `outro campus` |
| Validar ocorrência que ele mesmo registrou | `POST /ocorrencias/:id/validacoes` | RN-08 | 403 | E2E `validacoes` — `RN-08 self-validate` |
| Validar ocorrência de severidade 5 | `POST /ocorrencias/:id/validacoes` | Sev 5 exige DIRETOR ou ADMIN | 403 | E2E `validacoes` — `403 coordenador sev5` |
| Reabrir ocorrência RESOLVIDA | `PATCH /ocorrencias/:id/status` | RN-04: apenas ADMIN pode reabrir | 403 | E2E + Unit `RN-04` — `coordenador não reabre` |
| Acessar auditoria | `GET /auditoria/*` | Guard `@Roles` | 403 | — |
| Criar/alterar usuários | `POST /usuarios` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar/alterar categorias | `POST /categorias` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar aluno | `POST /alunos` | Guard `@Roles`: apenas ADMIN e SECRETARIA | 403 | E2E `alunos` — `403 coordenador cria aluno` |

---

## 3. EQUIPE PEDAGÓGICA

> **Papel:** apoio pedagógico — registra ocorrências, cria encaminhamentos e acessa relatórios.  
> **Escopo natural:** campus ao qual está vinculado.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Registrar ocorrência | `POST /ocorrencias` | Sem restrição de turma | — |
| Listar ocorrências do campus | `GET /ocorrencias` | H-08: filtrado por campus | Unit `listar` — `EquipePedagogica campus` |
| Visualizar ocorrência do campus | `GET /ocorrencias/:id` | H-08 / C-02 | Unit `buscarPorId` — `EquipePedagogica mesmo campus` |
| Criar encaminhamento | `POST /ocorrencias/:id/encaminhamentos` | Guard inclui EQUIPE_PEDAGOGICA | — |
| Verificar reincidências (campus-scoped) | `GET /ocorrencias/alunos/:id/reincidencias` | C-01 | Unit `reincidências` — `EquipePedagogica outro campus → 403` |
| Exportar relatórios | `GET /relatorios/*` | Guard inclui EQUIPE_PEDAGOGICA | — |
| Gerar/confirmar upload de evidência | `POST /evidencias/*` | Guard inclui EQUIPE_PEDAGOGICA | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| Visualizar ocorrência de outro campus | `GET /ocorrencias/:id` | H-08 / C-02 | 403 | Unit `buscarPorId` — `EquipePedagogica outro campus` |
| Verificar reincidências de outro campus | `GET /ocorrencias/alunos/:id/reincidencias` | C-01 | 403 | Unit `reincidências` — `EquipePedagogica outro campus` |
| Validar ocorrência | `POST /ocorrencias/:id/validacoes` | Guard `@Roles`: apenas COORDENADOR, DIRETOR, ADMIN | 403 | — |
| Reabrir ocorrência | `PATCH /ocorrencias/:id/status` → RESOLVIDA→EM_ACOMPANHAMENTO | RN-04 | 403 | — |
| Acessar auditoria | `GET /auditoria/*` | Guard `@Roles` | 403 | — |
| Criar/alterar usuários ou categorias | vários | Guard `@Roles`: apenas ADMIN | 403 | — |

---

## 4. DIRETOR

> **Papel:** aprovar ocorrências gravíssimas, reabrir ocorrências (não — apenas ADMIN), visão global.  
> **Escopo natural:** global (todos os campi).

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Registrar ocorrência | `POST /ocorrencias` | Guard inclui DIRETOR | — |
| Registrar ocorrência com data retroativa > 90 dias | `POST /ocorrencias` (+ `aprovacaoRetroativaDiretor: true`) | RN-11: DIRETOR pode usar o flag de aprovação | Unit `criar` — `RN-11 diretor aprova retroativa` |
| Listar todas as ocorrências | `GET /ocorrencias` | H-08: DIRETOR sem filtro de campus | Unit `listar` — `Diretor sem filtro` |
| Visualizar qualquer ocorrência | `GET /ocorrencias/:id` | H-08 / C-02: DIRETOR tem visão global | Unit `buscarPorId` — `Diretor qualquer campus` |
| Validar ocorrência de qualquer severidade (incluindo 5) | `POST /ocorrencias/:id/validacoes` | Guard + service: Sev 5 aceita DIRETOR | E2E `validacoes` — `diretor valida sev5` |
| Alterar status de qualquer ocorrência | `PATCH /ocorrencias/:id/status` | Guard inclui DIRETOR | — |
| Verificar reincidências de qualquer aluno | `GET /ocorrencias/alunos/:id/reincidencias` | Guard inclui DIRETOR; sem restrição de campus | E2E + Unit `reincidências` — `diretor pode` |
| Criar encaminhamentos | `POST /ocorrencias/:id/encaminhamentos` | Guard inclui DIRETOR | — |
| Remover evidência | `DELETE /evidencias/:id` | Service: DIRETOR está na lista de perfis autorizados | — |
| Acessar trilha de auditoria | `GET /auditoria/*` | Guard inclui DIRETOR | — |
| Acessar relatórios completos | `GET /relatorios/*` | Guard inclui DIRETOR | — |
| Visualizar dashboard estratégico | `GET /dashboard/*` | Sem `@Roles`, retorno global | — |
| Listar todos os usuários | `GET /usuarios` | Guard inclui DIRETOR | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| Reabrir ocorrência RESOLVIDA | `PATCH /ocorrencias/:id/status` → EM_ACOMPANHAMENTO | RN-04: apenas ADMIN pode reabrir | 403 | E2E + Unit `RN-04` — `diretor não reabre` |
| Criar/alterar usuários | `POST /usuarios` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar/alterar categorias | `POST/DELETE /categorias` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar aluno | `POST /alunos` | Guard `@Roles`: apenas ADMIN e SECRETARIA | 403 | — |

---

## 5. SECRETARIA

> **Papel:** cadastro e manutenção de dados de alunos e responsáveis.  
> **Escopo natural:** campus ao qual está vinculado.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Criar aluno | `POST /alunos` | Guard inclui SECRETARIA | E2E `alunos` — `201 secretaria cria` |
| Atualizar dados do aluno | `PATCH /alunos/:id` | Guard inclui SECRETARIA | E2E `alunos` — `200 secretaria atualiza` |
| Importar alunos em lote (Excel) | `POST /alunos/importar` | Guard inclui SECRETARIA | — |
| Listar alunos (campus-scoped) | `GET /alunos` | H-08: filtrado por campus | — |
| Criar/vincular responsável | `POST /responsaveis` | Guard inclui SECRETARIA | — |
| Remover vínculo responsável-aluno | `DELETE /responsaveis/:id/vinculos/:alunoId` | Guard inclui SECRETARIA | — |
| Listar ocorrências do campus | `GET /ocorrencias` | H-08: filtrado por campus | Unit `listar` — `Secretaria campus` |
| Exportar relatórios | `GET /relatorios/exportar` | Guard inclui SECRETARIA | — |
| Baixar template Excel | `GET /alunos/template` | Sem `@Roles` | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| Registrar ocorrência | `POST /ocorrencias` | Guard `@Roles`: SECRETARIA não está na lista | 403 | — |
| Validar ocorrência | `POST /ocorrencias/:id/validacoes` | Guard `@Roles` | 403 | — |
| Alterar status | `PATCH /ocorrencias/:id/status` | Guard `@Roles` | 403 | — |
| Verificar reincidências de outro campus | `GET /ocorrencias/alunos/:id/reincidencias` | C-01 | 403 | — |
| Acessar auditoria | `GET /auditoria/*` | Guard `@Roles` | 403 | — |
| Gerar/confirmar upload de evidência | `POST /evidencias/*` | Guard `@Roles`: SECRETARIA não está na lista de evidências | 403 | — |
| Criar/alterar usuários | `POST /usuarios` | Guard `@Roles`: apenas ADMIN | 403 | — |
| Criar/alterar categorias | `POST /categorias` | Guard `@Roles`: apenas ADMIN | 403 | — |

---

## 6. ADMIN

> **Papel:** gestão global de configurações, usuários e categorias. Não registra ocorrências.  
> **Escopo natural:** global (todos os campi, todos os segmentos).

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra | Teste |
|------|----------|-------|-------|
| Criar usuário | `POST /usuarios` | Guard: apenas ADMIN | — |
| Listar usuários | `GET /usuarios` | Guard inclui ADMIN | — |
| Alterar perfil de usuário | `PATCH /usuarios/:id/perfil` | Guard: apenas ADMIN | — |
| Desativar usuário | `DELETE /usuarios/:id` | Guard: apenas ADMIN | — |
| Gerenciar turmas de usuário | `PUT /usuarios/:id/turmas` | Guard: apenas ADMIN | — |
| Criar/desativar categoria | `POST/DELETE /categorias` | Guard: apenas ADMIN | — |
| Criar/atualizar subcategoria | `POST/PATCH /categorias/:id/subcategorias` | Guard: apenas ADMIN | — |
| Criar aluno | `POST /alunos` | Guard inclui ADMIN | E2E `alunos` — `201 admin cria` |
| Atualizar dados do aluno | `PATCH /alunos/:id` | Guard inclui ADMIN | E2E `alunos` — `200 admin atualiza` |
| Importar alunos em lote | `POST /alunos/importar` | Guard inclui ADMIN | — |
| Listar todas as ocorrências | `GET /ocorrencias` | H-08: ADMIN sem filtro | Unit `listar` — `Admin sem filtro` |
| Visualizar qualquer ocorrência | `GET /ocorrencias/:id` | H-08: ADMIN visão global | Unit `buscarPorId` — `Admin qualquer campus` |
| Reabrir ocorrência RESOLVIDA | `PATCH /ocorrencias/:id/status` | RN-04: apenas ADMIN com justificativa | E2E + Unit `RN-04` — `admin reabre` |
| Validar ocorrência de severidade 5 | `POST /ocorrencias/:id/validacoes` | Service: ADMIN aceito | E2E `validacoes` — `201 admin sev5` |
| Alterar qualquer status | `PATCH /ocorrencias/:id/status` | Guard inclui ADMIN | — |
| Remover evidência | `DELETE /evidencias/:id` | Service: ADMIN autorizado | Unit `evidencias` — `admin remove de outro` |
| Acessar trilha de auditoria | `GET /auditoria/*` | Guard: DIRETOR e ADMIN | — |
| Acessar relatórios | `GET /relatorios/*` | Guard inclui ADMIN | — |

### ❌ Jornadas Negadas

| Ação negada | Endpoint | Motivo | HTTP | Teste |
|-------------|----------|--------|------|-------|
| **Registrar ocorrência** | `POST /ocorrencias` | RBAC §11: ADMIN é gestor, não registrador | **403** | E2E `ocorrencias` — `403 ADMIN registra` |
| Reabrir RESOLVIDA sem justificativa | `PATCH /ocorrencias/:id/status` | RN-04: justificativa obrigatória | 400 | Unit `RN-04` — `admin sem justificativa` |
| Alterar ocorrência ARQUIVADA | `PATCH /ocorrencias/:id/status` | RN-12: read-only | 403 | E2E + Unit `RN-12` |

---

## 7. ALUNO (Perfil Externo)

> **Papel:** visualizar suas ocorrências, confirmar ciência formal, adicionar contrarrazões (apenas Superior).  
> **Nota:** ALUNO não acessa o sistema via painel web principal — usa links enviados por e-mail ou
> páginas públicas. O perfil `ALUNO` é definido no enum mas não está atribuído em nenhum `@Roles` de
> endpoints do sistema interno.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra |
|------|----------|-------|
| Confirmar ciência formal via link | `GET /ciencia-formal/:token` | `@Public` — token SHA-256 single-use (H-07) |
| Confirmar ciência (POST) | `POST /ciencia-formal/:token/confirmar` | `@Public` — consome o token, registra IP e user-agent |

### ❌ Jornadas Negadas

| Ação negada | Motivo | HTTP |
|-------------|--------|------|
| Qualquer endpoint interno com JWT de perfil ALUNO | `@Roles` não inclui ALUNO em nenhum controller interno | 403 |
| Listar ocorrências | Guard ou scoping por perfil lança `ForbiddenException` | 403 | 
| Usar token de ciência formal já utilizado | H-07: `dataConfirmacao` preenchida | 400 |
| Usar token de ciência formal expirado | H-07: > 5 dias úteis | 400 |

---

## 8. RESPONSÁVEL LEGAL (Perfil Externo)

> **Papel:** receber notificações sobre ocorrências do(s) filho(s)/tutelado(s), confirmar ciência formal.  
> **Nota:** assim como ALUNO, o perfil `RESPONSAVEL_LEGAL` não aparece em `@Roles` internos.
> O acesso é exclusivamente via token de ciência formal enviado por e-mail.

### ✅ Jornadas Permitidas

| Ação | Endpoint | Regra |
|------|----------|-------|
| Visualizar a ocorrência pelo link de ciência | `GET /ciencia-formal/:token` | `@Public` — exibe snapshot da ocorrência |
| Confirmar ciência via token | `POST /ciencia-formal/:token/confirmar` | `@Public` — token single-use |

### ❌ Jornadas Negadas

| Ação negada | Motivo | HTTP |
|-------------|--------|------|
| Qualquer endpoint autenticado com perfil RESPONSAVEL_LEGAL | `@Roles` não inclui este perfil | 403 |

---

## 9. Usuário Não Autenticado

> Qualquer requisição sem `Authorization: Bearer <jwt>` válido.

| Tentativa | HTTP |
|-----------|------|
| Qualquer endpoint protegido (`/ocorrencias`, `/alunos`, `/validacoes`, etc.) | **401 Unauthorized** |
| `GET /ciencia-formal/:token` | 200 (público) |
| `POST /auth/magic-link` | 200 (público, rate-limited: 3 req/min) |
| `GET /auth/csrf-token` | 200 (público) |

---

## 10. Matriz Resumida

| Capacidade | Prof. | Coord. | Eq.Ped. | Diretor | Secret. | Admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Registrar ocorrência | ✓¹ | ✓ | ✓ | ✓ | — | **—** |
| Listar ocorrências (campus-scoped) | ✓² | ✓³ | ✓³ | ✓ (global) | ✓³ | ✓ (global) |
| Visualizar ocorrência | ✓² | ✓³ | ✓³ | ✓ (global) | ✓³ | ✓ (global) |
| Validar ocorrência (sev ≤ 4) | — | ✓⁴ | — | ✓ | — | ✓ |
| Validar sev 5 (Gravíssima) | — | — | — | ✓ | — | ✓ |
| Alterar status | — | ✓ | — | ✓ | — | ✓ |
| Reabrir RESOLVIDA | — | — | — | — | — | ✓⁵ |
| Criar encaminhamento | — | ✓ | ✓ | ✓ | — | — |
| Verificar reincidências | — | ✓³ | ✓³ | ✓ (global) | — | ✓ (global) |
| Upload de evidências | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Remover evidência | ✓² | ✓ | — | ✓ | — | ✓ |
| Criar aluno | — | — | — | — | ✓ | ✓ |
| Atualizar aluno | — | — | — | — | ✓ | ✓ |
| Criar/alterar usuários | — | — | — | — | — | ✓ |
| Criar/alterar categorias | — | — | — | — | — | ✓ |
| Exportar relatórios | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Ver auditoria | — | — | — | ✓ | — | ✓ |
| Data retroativa > 90 dias | — | — | — | ✓⁶ | — | ✓⁶ |

**Legenda:**
- ¹ Apenas alunos de turmas vinculadas (RN-07)
- ² Apenas os que o próprio registrou
- ³ Apenas campus do usuário (H-08 / C-01 / C-02)
- ⁴ Não pode validar ocorrência que ele mesmo registrou (RN-08)
- ⁵ Exige justificativa no DTO (RN-04)
- ⁶ Exige flag `aprovacaoRetroativaDiretor: true` no DTO (RN-11)

---

## Cobertura de Testes Implementada

### Testes Unitários (`*.service.spec.ts`) — 329 testes

| Suite | Testes | Jornadas cobertas |
|-------|--------|-------------------|
| `ocorrencias.service.spec.ts` | 47 | criar (RN-01, RN-03, RN-07, RN-11), listar H-08 (todos os perfis), buscarPorId C-02 (todos os perfis), alterarStatus (P-03, RN-04, RN-12), alterarSeveridade (RN-12), verificarReincidencias C-01 |
| `validacoes.service.spec.ts` | 14 | RN-08 self-validate, Sev 5 restrição, decisões VALIDAR/DEVOLVER/ESCALAR, evento pós-validação |
| `evidencias.service.spec.ts` | 8 | upload, confirmação, listagem, remoção (uploader, ADMIN, COORDENADOR, professor negado) |
| `categorias.service.spec.ts` | 7 | CRUD, desativação lógica |
| `auth.service.spec.ts` | 20 | magic link, refresh, revogação, hash do token |
| Demais suites | 233 | alunos, responsáveis, notificações, SLA, dashboard, relatórios, auditoria, etc. |

### Testes de Integração E2E (`test/*.e2e-spec.ts`) — 78 testes

| Suite | Testes | Jornadas cobertas |
|-------|--------|-------------------|
| `ocorrencias.e2e-spec.ts` | 30 | Registro (201/401/403/400), Listagem H-08, GET por ID (C-02), PATCH status (RN-04/RN-12/P-03), Reincidências (C-01) |
| `validacoes.e2e-spec.ts` | 17 | POST (RN-08 self-validate, sev5 restrição, 401/403/400), GET listagem |
| `alunos.e2e-spec.ts` | 23 | POST 201/403/409, GET H-08 campus B isolado, buscar, PATCH 200/403 |
| `auth.e2e-spec.ts` | 7 | Magic link, CSRF, refresh, logout |
| `app.e2e-spec.ts` | 1 | Health check |

---

*Documento mantido pela equipe de desenvolvimento. Atualizar ao implementar novos perfis ou endpoints.*
