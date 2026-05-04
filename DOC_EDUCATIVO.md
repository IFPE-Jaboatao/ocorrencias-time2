# DOC_EDUCATIVO.md — SGOA: Documento de Instrução Educativa

> **Para o agente de IA:** Atualize este documento ao final de cada feature
> implementada, seguindo as regras da Seção 18 do CLAUDE.md. Nunca reescreva
> o que já está documentado — apenas adicione e expanda.
>
> **Para Luciano:** Este documento existe para que você consiga explicar e
> defender cada parte do sistema para os stakeholders — diretores, coordenadores,
> equipe pedagógica, setor jurídico e TI. Leia a seção do módulo que será avaliado
> antes de cada reunião ou apresentação.

---

## Índice

- [Visão Geral do Sistema](#visão-geral-do-sistema)
- [Arquitetura: Como as Peças se Conectam](#arquitetura-como-as-peças-se-conectam)
- [Stack Tecnológico: Por Que Essas Tecnologias?](#stack-tecnológico-por-que-essas-tecnologias)
- [Segurança e Privacidade: ECA e LGPD na Prática](#segurança-e-privacidade-eca-e-lgpd-na-prática)
- [Módulo: Autenticação (Auth)](#módulo-autenticação-auth)
- [Módulo: Alunos](#módulo-alunos)
- [Módulo: Ocorrências](#módulo-ocorrências)
- [Módulo: Validações](#módulo-validações)
- [Módulo: Encaminhamentos](#módulo-encaminhamentos)
- [Módulo: Notificações](#módulo-notificações)
- [Módulo: Evidências e Anexos](#módulo-evidências-e-anexos)
- [Módulo: Ciência Formal](#módulo-ciência-formal)
- [Módulo: Auditoria](#módulo-auditoria)
- [Módulo: SLA](#módulo-sla)
- [Módulo: Relatórios](#módulo-relatórios)
- [Módulo: Dashboard](#módulo-dashboard)
- [Perguntas Frequentes de Stakeholders](#perguntas-frequentes-de-stakeholders)

---

## Visão Geral do Sistema

### O que é o SGOA?

O SGOA (Sistema de Gestão de Ocorrências Acadêmicas) é um sistema web desenvolvido
para registrar, acompanhar e arquivar ocorrências que envolvem alunos da instituição
— sejam elas disciplinares, acadêmicas, comportamentais ou de saúde/bem-estar.

O sistema substitui registros em papel, planilhas e e-mails avulsos por um processo
padronizado, rastreável e conforme com as exigências legais do ECA (Estatuto da
Criança e do Adolescente) e da LGPD (Lei Geral de Proteção de Dados).

### Quem usa o sistema?

| Perfil | O que faz no sistema |
|---|---|
| **Professor** | Registra ocorrências dos alunos das suas turmas |
| **Coordenador Pedagógico** | Valida ocorrências graves, cria encaminhamentos, acompanha SLA |
| **Equipe Pedagógica/Psicólogo** | Registra e acompanha casos de saúde/bem-estar |
| **Diretor/Reitor** | Valida ocorrências gravíssimas, acessa relatórios estratégicos |
| **Secretaria** | Atualiza dados cadastrais, gera documentos |
| **Administrador** | Gerencia usuários, configurações, exporta relatórios |
| **Aluno** (Superior) | Visualiza suas próprias ocorrências, adiciona contrarrazões |
| **Responsável Legal** | Recebe notificações, confirma ciência formal (pais/tutores de menores) |

### Por que este sistema é crítico para a instituição?

1. **Obrigação legal:** Deixar de notificar os pais de um menor em uma ocorrência
   grave não é apenas falha operacional — é infração ao ECA. O sistema torna essa
   notificação automática e rastreável.

2. **Evidência jurídica:** Em casos que chegam ao Conselho Tutelar ou ao Judiciário,
   o sistema fornece trilha de auditoria imutável com todos os registros e decisões.

3. **Consistência:** Diferentes coordenadores, campi e segmentos passam a seguir
   o mesmo processo, com os mesmos critérios e os mesmos prazos.

---

## Arquitetura: Como as Peças se Conectam

### Diagrama simplificado

```
┌─────────────────────────────────────────────────────────┐
│                     USUÁRIO (Browser)                    │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│              FRONTEND — Next.js (React)                  │
│   Exibe telas, formulários, dashboards e notificações    │
│   Não contém regras de negócio — apenas apresentação     │
└──────────────────────────┬──────────────────────────────┘
                           │ REST API (JSON) + WebSocket
┌──────────────────────────▼──────────────────────────────┐
│              BACKEND — NestJS (Node.js)                  │
│                                                          │
│  Controllers → Services → Repositories                   │
│  Guards (RBAC) + Interceptors (Auditoria)                │
│  Filas BullMQ para jobs assíncronos (e-mails, SLA)       │
└──────────────┬───────────────────────┬───────────────────┘
               │                       │
┌──────────────▼──────┐   ┌────────────▼───────────────────┐
│   MySQL 8.0         │   │   Redis                         │
│   Dados da aplicação│   │   Cache + Filas BullMQ          │
└─────────────────────┘   └─────────────────────────────────┘
```

### A separação frontend / backend

O Next.js e o NestJS são dois servidores diferentes que se comunicam via API REST
(chamadas HTTP padronizadas com formato JSON). Isso significa:

- **Frontend (Next.js):** responsável por "como as coisas aparecem" — telas,
  formulários, gráficos. Faz perguntas ao backend e exibe as respostas.
- **Backend (NestJS):** responsável por "o que pode ser feito e como" — regras
  de negócio, segurança, banco de dados. Responde às perguntas do frontend.

**Por que separar?** Segurança. As regras de acesso e as validações críticas
(quem pode ver o quê, quando notificar um responsável) vivem no backend, que o
usuário nunca acessa diretamente. Mesmo que alguém tente "trapacear" pelo
navegador, o backend recusará a operação.

### As camadas do backend (NestJS)

O backend segue uma arquitetura em 5 camadas obrigatórias:

```
Request HTTP
    ↓
[1] CONTROLLER — recebe e valida o formato da requisição
    ↓
[2] SERVICE    — aplica as regras de negócio
    ↓
[3] REPOSITORY — consulta ou persiste dados no banco
    ↓
[4] ENTITY     — representa a tabela do banco de dados
    ↑
[2] SERVICE    — formata o resultado como ResponseDTO
    ↑
[1] CONTROLLER — retorna a resposta HTTP
```

**DTO (Data Transfer Object):** É um "formulário tipado" que define exatamente
quais campos são aceitos em uma requisição e quais validações se aplicam. Se
alguém enviar um campo inválido, o sistema rejeita antes de chegar na lógica de negócio.

---

## Stack Tecnológico: Por Que Essas Tecnologias?

### Por que NestJS no backend?

O NestJS é um framework para Node.js (JavaScript/TypeScript) que incentiva uma
estrutura organizada em módulos, muito similar ao que grandes sistemas corporativos
usam. Suas vantagens para o SGOA:

- **TypeScript:** linguagem com tipagem forte — o compilador captura erros antes
  de o código rodar. Em um sistema com dados sensíveis de menores, isso reduz
  significativamente os bugs.
- **Injeção de dependência:** facilita testes automatizados — é possível simular
  o banco de dados nos testes sem precisar de um banco real rodando.
- **Guards e Interceptors:** mecanismos nativos para implementar RBAC (controle
  de acesso por perfil) e auditoria sem poluir a lógica de negócio.

### Por que Next.js no frontend?

O Next.js é um framework React que permite renderizar páginas tanto no servidor
quanto no navegador. Para o SGOA:

- **Server-side rendering:** páginas como a de ciência formal (que responsáveis
  acessam por link de e-mail) carregam mais rápido e são indexáveis.
- **App Router:** estrutura de roteamento moderna que organiza as páginas por
  funcionalidade, não por tipo de arquivo.
- **React:** biblioteca mais usada do mundo para interfaces — facilita
  encontrar profissionais e manter o sistema no futuro.

### Por que MySQL?

MySQL é um dos bancos de dados relacionais mais consolidados do mercado, com
mais de 30 anos de uso em produção em instituições de todo tamanho. Para o SGOA:

- **Maturidade:** vasta documentação, suporte corporativo e ferramentas de administração.
- **ACID:** garante consistência das transações — se uma operação falha no meio
  do caminho (ex: criar ocorrência + registrar auditoria), ambas são desfeitas juntas.
- **Relacional:** os dados do SGOA têm relacionamentos claros (ocorrência pertence
  a um aluno, que tem responsáveis legais) — o modelo relacional reflete isso.

### Por que Redis?

O Redis é usado para duas funções:

1. **Filas de jobs (BullMQ):** e-mails, notificações e geração de relatórios não
   bloqueiam a requisição do usuário — vão para uma fila e são processados em segundo plano.
2. **Cache:** resultados de queries lentas (ex: dashboard com estatísticas) são
   armazenados temporariamente para resposta mais rápida.

---

## Segurança e Privacidade: ECA e LGPD na Prática

### O que a LGPD exige do SGOA?

A Lei Geral de Proteção de Dados (Lei 13.709/2018) estabelece regras para o
tratamento de dados pessoais. As principais implicações para o SGOA:

| Exigência LGPD | Como o SGOA atende |
|---|---|
| Dados sensíveis criptografados (art. 46) | CPF armazenado com AES-256; evidências com criptografia no S3 |
| Dados de menores com proteção especial (art. 14) | Campos `select: false` no TypeORM; acesso restrito por perfil |
| Pseudonimização em relatórios (art. 13) | Dados de menores pseudonimizados em relatórios analíticos por padrão |
| Direito do titular (DSAR, art. 18) | Mecanismo de exportação do prontuário em até 15 dias úteis |
| Retenção definida | Dados de menores: até maioridade + 5 anos |

### O que o ECA exige do SGOA?

O Estatuto da Criança e do Adolescente (Lei 8.069/1990) impõe obrigações
específicas para instituições de ensino:

| Situação | Obrigação (ECA) | Como o SGOA implementa |
|---|---|---|
| Ocorrência com menor, Sev. ≥ 3 | Notificar responsável legal (art. 53) | Notificação automática obrigatória, não pode ser desligada |
| Suspeita de violência/abandono | Comunicar ao Conselho Tutelar (art. 13) | Protocolo gerado automaticamente na categoria correspondente |
| Infrequência > 25% de menores | Comunicar ao Conselho Tutelar (art. 56) | Alerta automático ao registrar infrequência crítica |

### Como os dados de menores são protegidos?

1. **CPF nunca aparece em logs:** configurado para ser mascarado automaticamente
   em todos os registros de log do sistema.
2. **CPF nunca retorna em queries padrão:** campo marcado com `select: false` no
   TypeORM — só é buscado quando explicitamente necessário.
3. **Evidências com URL temporária:** arquivos armazenados no S3 com URLs que
   expiram em 15 minutos — não existe link permanente público para uma foto ou
   documento de um menor.
4. **Auditoria de acesso:** todo acesso a dados sensíveis é registrado com quem
   acessou, quando e de qual endereço IP.

---

## Módulo: Autenticação (Auth)

> **Status:** ⏳ Aguardando implementação
> **Atualizar após:** implementação de `AuthModule` + testes

### O que este módulo faz

_(A ser preenchido após implementação)_

### Por que foi construído assim

_(A ser preenchido após implementação)_

### Camadas e responsabilidades

_(A ser preenchido após implementação)_

### Regras de negócio implementadas

_(RF-01 — A ser preenchido após implementação)_

### Fluxo principal (passo a passo)

_(A ser preenchido após implementação)_

### Como explicar para um stakeholder não técnico

_(A ser preenchido após implementação)_

---

## Módulo: Alunos

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação — seguir template da Seção 18 do CLAUDE.md)_

---

## Módulo: Ocorrências

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Validações

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Encaminhamentos

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Notificações

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Evidências e Anexos

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Ciência Formal

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Auditoria

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: SLA

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Relatórios

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Módulo: Dashboard

> **Status:** ⏳ Aguardando implementação

_(Estrutura a ser preenchida após implementação)_

---

## Perguntas Frequentes de Stakeholders

> Esta seção acumula perguntas reais feitas por stakeholders e as respostas
> corretas. Adicionar aqui a cada reunião de revisão.

### "Por que o professor não pode ver ocorrências de alunos de outras turmas?"

Por proteção de dados e integridade do processo. Um professor que não teve
contato com aquele aluno não tem contexto para avaliar ou comentar a ocorrência,
e a visualização indevida de dados sensíveis viola a LGPD. O sistema restringe
automaticamente o acesso ao escopo de trabalho de cada usuário.

### "O sistema pode ser acessado de qualquer lugar ou só dentro da escola?"

O sistema é acessível via internet (HTTPS), mas exige autenticação pelo sistema
institucional (Azure AD / Google Workspace). Isso significa que apenas usuários
com conta ativa na instituição conseguem acessar — e se a conta for desativada,
o acesso ao SGOA é revogado automaticamente.

### "Como sabemos que alguém não alterou um registro depois do fato?"

Todas as mudanças em dados importantes geram entradas na tabela de auditoria,
que é tecnicamente imutável — há uma regra no próprio banco de dados que impede
qualquer alteração ou exclusão nessa tabela. É o equivalente digital de um livro
de atas com páginas numeradas e costuradas.

### "O que acontece se o sistema ficar fora do ar durante uma ocorrência grave?"

O sistema tem meta de disponibilidade de 99,5% no horário acadêmico (06h–22h),
com backup a cada hora e plano de recuperação de até 4 horas em caso de falha
grave. Para ocorrências de Severidade 5 (risco à integridade), o protocolo
institucional não depende exclusivamente do sistema — os canais de comunicação
de emergência são independentes.

### "Quem tem acesso aos dados psicológicos dos alunos?"

Apenas a Equipe Psicopedagógica, o Coordenador e o Diretor têm acesso a campos
com informações clínicas. Mesmo dentro do sistema, esses campos são ocultados
automaticamente para perfis sem permissão — incluindo professores que registraram
a ocorrência original.

---

*Versão: 1.0 — Criado em Abril/2026*
*Atualizar após cada feature implementada, conforme protocolo da Seção 18 do CLAUDE.md*
