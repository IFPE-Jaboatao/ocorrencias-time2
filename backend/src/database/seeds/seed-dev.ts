/**
 * Seed de desenvolvimento — popula o banco com dados de demonstração.
 * Executa com: npm run seed:dev
 * Executar APÓS migration:run.
 */
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import * as crypto from 'crypto';

// Helpers de data
const daysAgo   = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 19).replace('T', ' '); };
const hoursFrom = (base: string, h: number) => { const d = new Date(base); d.setHours(d.getHours() + h); return d.toISOString().slice(0, 19).replace('T', ' '); };

function slaDeadline(criadoEm: string, severidade: number): string {
  const horas = [0, 120, 72, 48, 24, 4][severidade] ?? 48;
  return hoursFrom(criadoEm, horas);
}

async function seed() {
  await AppDataSource.initialize();
  const q = AppDataSource.createQueryRunner();
  await q.connect();
  await q.startTransaction();

  try {
    // ── Garantir tabela codigo_sequencia ──────────────────────────────────────
    await q.query(`
      CREATE TABLE IF NOT EXISTS codigo_sequencia (
        ano      INT        NOT NULL,
        segmento VARCHAR(2) NOT NULL,
        ultimo_seq INT      NOT NULL DEFAULT 0,
        PRIMARY KEY (ano, segmento)
      )
    `);

    // ── Guarda idempotente: abortar se o seed já foi executado ────────────────
    const [{ total }] = await q.query(
      `SELECT COUNT(*) AS total FROM categorias_ocorrencia`
    );
    if (Number(total) > 0) {
      console.log('');
      console.log('⚠️  Seed já foi executado anteriormente (categorias encontradas).');
      console.log('   Para re-executar, limpe as tabelas manualmente ou use:');
      console.log('   npm run seed:reset  (apaga tudo e re-insere)');
      console.log('');
      await q.rollbackTransaction();
      return;
    }

    // ── Usuários de teste ──────────────────────────────────────────────────
    const usuarios = [
      { nome: 'Professor Silva',   email: 'professor@escola.edu.br',   perfil: 'PROFESSOR',    campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL']) },
      { nome: 'Coordenadora Ana',  email: 'coordenador@escola.edu.br', perfil: 'COORDENADOR',  campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO']) },
      { nome: 'Diretor Costa',     email: 'diretor@escola.edu.br',     perfil: 'DIRETOR',       campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']) },
      { nome: 'Administrador',     email: 'admin@escola.edu.br',       perfil: 'ADMIN',          campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']) },
    ];

    for (const u of usuarios) {
      await q.query(
        `INSERT IGNORE INTO usuarios (id, nome, email, cpf_encriptado, perfil, campus, segmentos_responsaveis, ativo)
         VALUES (UUID(), ?, ?, '', ?, ?, ?, 1)`,
        [u.nome, u.email, u.perfil, u.campus, u.segmentos],
      );
    }

    // ── Categorias de ocorrência ───────────────────────────────────────────
    const categorias = [
      {
        nome: 'Disciplinar',
        subcategorias: JSON.stringify(['Agressão física', 'Bullying/Cyberbullying', 'Porte de objeto perigoso', 'Desrespeito a professor']),
        severidade_padrao: 3, sla_horas: 48, exige_notif_responsavel: 1,
        obrigatorio_legal: 0, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 1,
      },
      {
        nome: 'Acadêmica',
        subcategorias: JSON.stringify(['Plágio/Desonestidade', 'Infrequência crítica (>25%)', 'Reprovação por falta']),
        severidade_padrao: 2, sla_horas: 72, exige_notif_responsavel: 1,
        obrigatorio_legal: 0, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 0,
      },
      {
        nome: 'Saúde/Bem-estar',
        subcategorias: JSON.stringify(['Suspeita de violência doméstica', 'Automutilação / risco', 'Problema de saúde grave']),
        severidade_padrao: 4, sla_horas: 24, exige_notif_responsavel: 1,
        obrigatorio_legal: 1, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 1,
      },
      {
        nome: 'Comportamental',
        subcategorias: JSON.stringify(['Uso de celular em aula', 'Vocabulário inadequado', 'Comportamento perturbador']),
        severidade_padrao: 1, sla_horas: 120, exige_notif_responsavel: 0,
        obrigatorio_legal: 0, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 0,
      },
    ];

    for (const c of categorias) {
      await q.query(
        `INSERT IGNORE INTO categorias_ocorrencia
           (id, nome, subcategorias, severidade_padrao, sla_horas, exige_notif_responsavel, obrigatorio_legal, segmentos_aplicaveis, exige_validacao, ativo)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [c.nome, c.subcategorias, c.severidade_padrao, c.sla_horas, c.exige_notif_responsavel, c.obrigatorio_legal, c.segmentos_aplicaveis, c.exige_validacao],
      );
    }

    // ── Alunos de teste ────────────────────────────────────────────────────
    const alunoData = [
      { matricula: '2026FM0001', nome: 'Lucas Oliveira',         data_nascimento: '2013-05-10', segmento: 'FUNDAMENTAL', campus: 'Campus A', curso: 'Ensino Fundamental',  turma: '8A',     cpf_enc: encryptFake('111.111.111-11') },
      { matricula: '2026ME0001', nome: 'Ana Paula Souza',        data_nascimento: '2007-11-22', segmento: 'MEDIO',       campus: 'Campus A', curso: 'Ensino Médio',         turma: '3B',     cpf_enc: encryptFake('222.222.222-22') },
      { matricula: '2026SU0001', nome: 'Carlos Eduardo Lima',    data_nascimento: '2002-03-15', segmento: 'SUPERIOR',    campus: 'Campus A', curso: 'ADS',                  turma: '2024.1', cpf_enc: encryptFake('333.333.333-33') },
    ];

    const alunoIds: Record<string, string> = {};
    for (const a of alunoData) {
      const id = crypto.randomUUID();
      alunoIds[a.matricula] = id;
      await q.query(
        `INSERT IGNORE INTO alunos (id, matricula, nome, data_nascimento, cpf_encriptado, segmento, campus, curso, turma, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO')`,
        [id, a.matricula, a.nome, a.data_nascimento, a.cpf_enc, a.segmento, a.campus, a.curso, a.turma],
      );
    }

    // ── Responsáveis legais ────────────────────────────────────────────────
    const responsaveis = [
      { alunoMatricula: '2026FM0001', nome: 'Maria Oliveira', parentesco: 'Mãe', email: 'maria.oliveira@gmail.com', telefone: '81999990001' },
      { alunoMatricula: '2026ME0001', nome: 'Roberto Souza',  parentesco: 'Pai', email: 'roberto.souza@gmail.com',  telefone: '81999990002' },
    ];

    for (const r of responsaveis) {
      const alunoId = alunoIds[r.alunoMatricula];
      if (!alunoId) continue;
      await q.query(
        `INSERT IGNORE INTO responsaveis_legais (id, aluno_id, nome, cpf_encriptado, parentesco, email, telefone, receber_notificacoes)
         VALUES (UUID(), ?, ?, '', ?, ?, ?, 1)`,
        [alunoId, r.nome, r.parentesco, r.email, r.telefone],
      );
    }

    // ── Ler IDs necessários para as ocorrências ────────────────────────────
    const [profRow]   = await q.query(`SELECT id FROM usuarios WHERE email = 'professor@escola.edu.br' LIMIT 1`);
    const [coordRow]  = await q.query(`SELECT id FROM usuarios WHERE email = 'coordenador@escola.edu.br' LIMIT 1`);
    const [catDisc]   = await q.query(`SELECT id FROM categorias_ocorrencia WHERE nome = 'Disciplinar' LIMIT 1`);
    const [catAcad]   = await q.query(`SELECT id FROM categorias_ocorrencia WHERE nome = 'Acadêmica' LIMIT 1`);
    const [catSaude]  = await q.query(`SELECT id FROM categorias_ocorrencia WHERE nome = 'Saúde/Bem-estar' LIMIT 1`);
    const [catComport]= await q.query(`SELECT id FROM categorias_ocorrencia WHERE nome = 'Comportamental' LIMIT 1`);

    // Buscar alunos (INSERT IGNORE pode ter ignorado — buscar pelo dado real)
    const [lucasRow]  = await q.query(`SELECT id FROM alunos WHERE matricula = '2026FM0001' LIMIT 1`);
    const [anaRow]    = await q.query(`SELECT id FROM alunos WHERE matricula = '2026ME0001' LIMIT 1`);
    const [carlosRow] = await q.query(`SELECT id FROM alunos WHERE matricula = '2026SU0001' LIMIT 1`);

    const profId    = profRow?.id;
    const coordId   = coordRow?.id;
    const discId    = catDisc?.id;
    const acadId    = catAcad?.id;
    const saudeId   = catSaude?.id;
    const comportId = catComport?.id;
    const lucasId   = lucasRow?.id;
    const anaId     = anaRow?.id;
    const carlosId  = carlosRow?.id;

    if (!profId || !coordId || !discId || !acadId || !saudeId || !comportId || !lucasId || !anaId || !carlosId) {
      throw new Error('Não foi possível recuperar IDs base. Verifique se o banco está limpo e rode novamente.');
    }

    // ── Ocorrências de demonstração ────────────────────────────────────────
    // Formato código: OC-YYYY-NNNNN-SEG
    const ano = new Date().getFullYear();

    interface OcDef {
      codigo: string; alunoId: string; regId: string; catId: string;
      subcategoria: string | null; sev: number; dataInc: string;
      local: string; descricao: string; status: string;
      dataResolucao: string | null; criadoEm: string;
    }

    const ocorrencias: OcDef[] = [
      // ── Lucas (FUNDAMENTAL, menor) ─────────────────────────────────────
      {
        codigo: `OC-${ano}-00001-FM`,
        alunoId: lucasId, regId: profId, catId: discId,
        subcategoria: 'Bullying/Cyberbullying', sev: 3,
        dataInc: daysAgo(5).slice(0, 10), local: 'Pátio — Bloco A',
        descricao: 'Aluno foi flagrado enviando mensagens ofensivas para colega de turma pelo grupo do WhatsApp da escola. Colega relatou à professora que estava sendo alvo de humilhações constantes desde o início do bimestre. Situação documentada com prints das mensagens.',
        status: 'ABERTA', dataResolucao: null, criadoEm: daysAgo(5),
      },
      {
        codigo: `OC-${ano}-00002-FM`,
        alunoId: lucasId, regId: profId, catId: comportId,
        subcategoria: 'Uso de celular em aula', sev: 1,
        dataInc: daysAgo(20).slice(0, 10), local: 'Sala 204 — Bloco B',
        descricao: 'Aluno utilizou o celular durante a aula de Matemática para jogar games. Advertido verbalmente. Celular recolhido e devolvido ao final da aula conforme regulamento escolar.',
        status: 'RESOLVIDA', dataResolucao: daysAgo(18), criadoEm: daysAgo(20),
      },
      {
        codigo: `OC-${ano}-00003-FM`,
        alunoId: lucasId, regId: profId, catId: discId,
        subcategoria: 'Agressão física', sev: 4,
        dataInc: daysAgo(2).slice(0, 10), local: 'Quadra esportiva',
        descricao: 'Durante o intervalo, o aluno agrediu fisicamente um colega após discussão no jogo de futsal. O colega agredido apresentou hematoma no braço direito. Testemunhas: 3 alunos da turma 8B. Pais/responsáveis foram acionados por telefone. Aguardando validação do coordenador para abertura de processo disciplinar.',
        status: 'AGUARDANDO_VALIDACAO', dataResolucao: null, criadoEm: daysAgo(2),
      },
      {
        codigo: `OC-${ano}-00004-FM`,
        alunoId: lucasId, regId: profId, catId: acadId,
        subcategoria: 'Infrequência crítica (>25%)', sev: 2,
        dataInc: daysAgo(7).slice(0, 10), local: 'Sala 204 — Bloco B',
        descricao: 'Aluno atingiu 28% de faltas no 2º bimestre, superando o limite legal de 25%. Contato com responsáveis realizado sem sucesso em duas tentativas. Situação encaminhada à coordenação para providências conforme ECA art. 56.',
        status: 'ABERTA', dataResolucao: null, criadoEm: daysAgo(7),
      },

      // ── Ana Paula (MÉDIO) ─────────────────────────────────────────────
      {
        codigo: `OC-${ano}-00005-ME`,
        alunoId: anaId, regId: profId, catId: acadId,
        subcategoria: 'Plágio/Desonestidade', sev: 3,
        dataInc: daysAgo(10).slice(0, 10), local: 'Laboratório de Informática',
        descricao: 'Aluna entregou trabalho de Biologia com 85% de similaridade com artigo publicado online (verificado via Turnitin). Confrontada, alegou ter "se baseado muito" no texto sem referenciar. Trabalho zerado. Aguardando definição de medidas pedagógicas adicionais pela coordenação.',
        status: 'EM_ACOMPANHAMENTO', dataResolucao: null, criadoEm: daysAgo(10),
      },
      {
        codigo: `OC-${ano}-00006-ME`,
        alunoId: anaId, regId: profId, catId: comportId,
        subcategoria: 'Vocabulário inadequado', sev: 2,
        dataInc: daysAgo(25).slice(0, 10), local: 'Sala 301 — Bloco C',
        descricao: 'Aluna utilizou linguagem inadequada ao se referir à professora de Português na presença de colegas. Situação resolvida após conversa com a coordenação e pedido de desculpas formal à docente.',
        status: 'RESOLVIDA', dataResolucao: daysAgo(23), criadoEm: daysAgo(25),
      },
      {
        codigo: `OC-${ano}-00007-ME`,
        alunoId: anaId, regId: coordId, catId: saudeId,
        subcategoria: 'Automutilação / risco', sev: 5,
        dataInc: daysAgo(1).slice(0, 10), local: 'Banheiro feminino — Bloco A',
        descricao: 'Colega relatou ao professor que Ana Paula comentou sobre pensamentos de se machucar. Ao ser chamada pela orientadora, a aluna confirmou estar passando por período difícil e apresentou marcas no antebraço. Responsável (pai) foi contatado e buscou a aluna. Equipe de saúde escolar acionada. Situação requer acompanhamento psicológico urgente.',
        status: 'AGUARDANDO_VALIDACAO', dataResolucao: null, criadoEm: daysAgo(1),
      },
      {
        codigo: `OC-${ano}-00008-ME`,
        alunoId: anaId, regId: profId, catId: discId,
        subcategoria: 'Desrespeito a professor', sev: 2,
        dataInc: daysAgo(8).slice(0, 10), local: 'Sala 301 — Bloco C',
        descricao: 'Aluna recusou-se a guardar o celular após solicitação do professor de Matemática e fez comentário irônico na frente da turma. Caso encaminhado à coordenação e resolvido com suspensão de 1 dia e Termo de Compromisso assinado pelos responsáveis.',
        status: 'RESOLVIDA', dataResolucao: daysAgo(6), criadoEm: daysAgo(8),
      },

      // ── Carlos Eduardo (SUPERIOR) ─────────────────────────────────────
      {
        codigo: `OC-${ano}-00009-SU`,
        alunoId: carlosId, regId: profId, catId: acadId,
        subcategoria: 'Plágio/Desonestidade', sev: 3,
        dataInc: daysAgo(15).slice(0, 10), local: 'Laboratório de Programação',
        descricao: 'Aluno entregou projeto de Estrutura de Dados idêntico ao de outro aluno de turma diferente. Análise comparativa confirmou cópia integral (100% de similaridade no código-fonte). Nota zerada em ambos os casos. Processo de abertura de Comissão Disciplinar em andamento conforme regulamento acadêmico do curso.',
        status: 'EM_ACOMPANHAMENTO', dataResolucao: null, criadoEm: daysAgo(15),
      },
      {
        codigo: `OC-${ano}-00010-SU`,
        alunoId: carlosId, regId: profId, catId: discId,
        subcategoria: 'Desrespeito a professor', sev: 2,
        dataInc: daysAgo(3).slice(0, 10), local: 'Sala 501 — Bloco D',
        descricao: 'Aluno questionou de forma agressiva a nota recebida na prova de Banco de Dados, levantando a voz e interrompendo a aula. Após intervenção da coordenação, aluno se acalmou e pediu desculpas. Recomendado acompanhamento com orientador acadêmico.',
        status: 'ABERTA', dataResolucao: null, criadoEm: daysAgo(3),
      },
      {
        codigo: `OC-${ano}-00011-SU`,
        alunoId: carlosId, regId: coordId, catId: acadId,
        subcategoria: 'Reprovação por falta', sev: 2,
        dataInc: daysAgo(30).slice(0, 10), local: 'Coordenação do Curso',
        descricao: 'Aluno atingiu 30% de faltas na disciplina de Engenharia de Software, ultrapassando o limite de 25% previsto no regulamento. Foi notificado formalmente sobre o risco de reprovação por frequência. Aluno assinou ciência e comprometeu-se a regularizar presença.',
        status: 'RESOLVIDA', dataResolucao: daysAgo(27), criadoEm: daysAgo(30),
      },
      {
        codigo: `OC-${ano}-00012-SU`,
        alunoId: carlosId, regId: profId, catId: comportId,
        subcategoria: 'Comportamento perturbador', sev: 1,
        dataInc: daysAgo(12).slice(0, 10), local: 'Biblioteca — Campus A',
        descricao: 'Aluno e colega conversavam em volume alto na biblioteca, perturbando outros estudantes. Advertidos pelo bibliotecário e redirecionados para área de estudo em grupo.',
        status: 'RESOLVIDA', dataResolucao: daysAgo(12), criadoEm: daysAgo(12),
      },
    ];

    // Inserir ocorrências
    const ocIds: string[] = [];
    for (const oc of ocorrencias) {
      const id = crypto.randomUUID();
      ocIds.push(id);
      const sla = slaDeadline(oc.criadoEm, oc.sev);
      await q.query(
        `INSERT IGNORE INTO ocorrencias
           (id, codigo, aluno_id, registrador_id, categoria_id, subcategoria, severidade,
            data_incidente, local, descricao, status, ciencia_formal_status,
            data_resolucao, sla_prazo, criado_em, atualizado_em)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, ?, ?, ?)`,
        [
          id, oc.codigo, oc.alunoId, oc.regId, oc.catId, oc.subcategoria, oc.sev,
          oc.dataInc, oc.local, oc.descricao, oc.status,
          oc.dataResolucao, sla, oc.criadoEm, oc.criadoEm,
        ],
      );
    }

    // ── Encaminhamentos para algumas ocorrências ──────────────────────────
    // Ocorrência 5 (índice 4) = Ana Paula plágio → em acompanhamento → encaminhamento pendente
    const ocAnaPlagio = ocIds[4];
    // Ocorrência 9 (índice 8) = Carlos plágio → em acompanhamento → comissão disciplinar
    const ocCarlosPlagio = ocIds[8];

    if (ocAnaPlagio) {
      await q.query(
        `INSERT IGNORE INTO encaminhamentos
           (id, ocorrencia_id, tipo, responsavel_id, prazo, descricao, status)
         VALUES (UUID(), ?, 'Acompanhamento Pedagógico', ?, ?, ?, 'PENDENTE')`,
        [ocAnaPlagio, coordId, daysAgo(-5).slice(0, 10),
         'Realizar reunião com a aluna e responsáveis para discutir consequências do plágio e definir plano de reescrita do trabalho sob supervisão do professor.'],
      );
    }

    if (ocCarlosPlagio) {
      await q.query(
        `INSERT IGNORE INTO encaminhamentos
           (id, ocorrencia_id, tipo, responsavel_id, prazo, descricao, status)
         VALUES (UUID(), ?, 'Comissão Disciplinar', ?, ?, ?, 'PENDENTE')`,
        [ocCarlosPlagio, coordId, daysAgo(-8).slice(0, 10),
         'Instaurar Comissão Disciplinar conforme art. 14 do Regulamento Acadêmico. Prazo máximo de 10 dias úteis para conclusão (RN-14). Notificar o aluno formalmente por escrito.'],
      );
      await q.query(
        `INSERT IGNORE INTO encaminhamentos
           (id, ocorrencia_id, tipo, responsavel_id, prazo, descricao, status)
         VALUES (UUID(), ?, 'Notificação Formal ao Aluno', ?, ?, ?, 'EXECUTADO')`,
        [ocCarlosPlagio, profId, daysAgo(13).slice(0, 10),
         'Emitir notificação formal ao aluno sobre a abertura do processo disciplinar, incluindo data, hora e local da reunião da comissão.'],
      );
    }

    // ── Atualizar sequência de códigos ────────────────────────────────────
    await q.query(
      `INSERT INTO codigo_sequencia (ano, segmento, ultimo_seq) VALUES (?, 'FM', 4)
       ON DUPLICATE KEY UPDATE ultimo_seq = GREATEST(ultimo_seq, 4)`, [ano]);
    await q.query(
      `INSERT INTO codigo_sequencia (ano, segmento, ultimo_seq) VALUES (?, 'ME', 4)
       ON DUPLICATE KEY UPDATE ultimo_seq = GREATEST(ultimo_seq, 4)`, [ano]);
    await q.query(
      `INSERT INTO codigo_sequencia (ano, segmento, ultimo_seq) VALUES (?, 'SU', 4)
       ON DUPLICATE KEY UPDATE ultimo_seq = GREATEST(ultimo_seq, 4)`, [ano]);

    await q.commitTransaction();

    console.log('');
    console.log('✅ Seed concluído com sucesso!');
    console.log('');
    console.log('👤 Usuários criados:');
    console.log('   professor@escola.edu.br   → PROFESSOR   / Campus A');
    console.log('   coordenador@escola.edu.br → COORDENADOR / Campus A');
    console.log('   diretor@escola.edu.br     → DIRETOR     / Campus A');
    console.log('   admin@escola.edu.br       → ADMIN       / Campus A');
    console.log('');
    console.log('🎓 Alunos criados:');
    console.log('   Lucas Oliveira (FUNDAMENTAL)   — 4 ocorrências');
    console.log('   Ana Paula Souza (MÉDIO)        — 4 ocorrências');
    console.log('   Carlos Eduardo Lima (SUPERIOR) — 4 ocorrências');
    console.log('');
    console.log('📋 12 ocorrências de demonstração inseridas');
    console.log('📌 2 encaminhamentos criados');
    console.log('');
    console.log('ℹ️  Para receber magic links, certifique-se de que SMTP está configurado no .env');
    console.log('');
  } catch (err) {
    await q.rollbackTransaction();
    console.error('');
    console.error('❌ Seed falhou:', err);
    process.exit(1);
  } finally {
    await q.release();
    await AppDataSource.destroy();
  }
}

function encryptFake(cpf: string): string {
  // Placeholder — em produção usa CryptoService (AES-256-GCM).
  return `SEED_ENC:${Buffer.from(cpf).toString('base64')}`;
}

seed();
