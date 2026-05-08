/**
 * Seed de produção — popula apenas dados estruturais obrigatórios.
 * NÃO insere alunos, ocorrências ou dados de demonstração.
 *
 * Executa com: npm run seed:prod
 * Pré-requisito: npm run migration:run já executado.
 *
 * É idempotente — pode ser re-executado sem duplicar dados.
 */
import 'reflect-metadata';
import * as readline from 'readline';
import * as crypto   from 'crypto';
import { AppDataSource } from '../data-source';

// ─── Categorias e subcategorias (Manual do Discente) ──────────────────────────

const SEGS_ALL = JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']);

interface SubDef {
  nome: string; sev: number; sla: number;
  val: boolean; notif: boolean; legal: boolean; proto: string | null;
}
interface CatDef {
  nome: string; sev: number; sla: number;
  val: boolean; notif: boolean; legal: boolean;
  subs: SubDef[];
}

const CATEGORIAS: CatDef[] = [
  {
    nome: 'Disciplinar', sev: 3, sla: 48, val: true, notif: true, legal: false,
    subs: [
      { nome: 'Agressão física entre discentes',       sev: 4, sla: 24,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Agressão verbal / ameaça',              sev: 3, sla: 48,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Bullying presencial',                   sev: 3, sla: 48,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Cyberbullying',                         sev: 3, sla: 48,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Desrespeito a docente ou funcionário',  sev: 3, sla: 48,  val: true,  notif: false, legal: false, proto: null },
      { nome: 'Porte de objeto cortante ou perigoso',  sev: 5, sla: 4,   val: true,  notif: true,  legal: true,  proto: 'CONSELHO_TUTELAR' },
      { nome: 'Dano ao patrimônio escolar',            sev: 2, sla: 72,  val: false, notif: false, legal: false, proto: null },
      { nome: 'Recusa a cumprir orientação',           sev: 2, sla: 72,  val: false, notif: false, legal: false, proto: null },
      { nome: 'Invasão de espaço restrito',            sev: 3, sla: 48,  val: true,  notif: false, legal: false, proto: null },
    ],
  },
  {
    nome: 'Frequência e Absenteísmo', sev: 2, sla: 72, val: false, notif: true, legal: false,
    subs: [
      { nome: 'Infrequência crítica (> 25% de faltas)', sev: 3, sla: 48,  val: false, notif: true,  legal: true,  proto: 'CONSELHO_TUTELAR' },
      { nome: 'Faltas injustificadas recorrentes',       sev: 2, sla: 72,  val: false, notif: true,  legal: false, proto: null },
      { nome: 'Atraso reiterado (> 3x por bimestre)',    sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
      { nome: 'Ausência em avaliação sem justificativa', sev: 2, sla: 72,  val: false, notif: false, legal: false, proto: null },
      { nome: 'Evasão escolar (risco)',                  sev: 4, sla: 24,  val: true,  notif: true,  legal: true,  proto: 'CONSELHO_TUTELAR' },
    ],
  },
  {
    nome: 'Integridade Acadêmica', sev: 3, sla: 48, val: true, notif: false, legal: false,
    subs: [
      { nome: 'Plágio em trabalho acadêmico',              sev: 3, sla: 48, val: true, notif: false, legal: false, proto: null },
      { nome: 'Cópia em avaliação (cola)',                 sev: 3, sla: 48, val: true, notif: false, legal: false, proto: null },
      { nome: 'Fraude em documentos escolares',            sev: 4, sla: 24, val: true, notif: true,  legal: false, proto: null },
      { nome: 'Uso indevido de IA em avaliação',           sev: 3, sla: 48, val: true, notif: false, legal: false, proto: null },
      { nome: 'Venda ou cessão de trabalhos acadêmicos',   sev: 4, sla: 24, val: true, notif: true,  legal: false, proto: null },
    ],
  },
  {
    nome: 'Saúde e Bem-estar', sev: 4, sla: 24, val: true, notif: true, legal: true,
    subs: [
      { nome: 'Suspeita de violência doméstica',             sev: 5, sla: 4,  val: true, notif: false, legal: true, proto: 'CONSELHO_TUTELAR' },
      { nome: 'Automutilação ou risco de suicídio',          sev: 5, sla: 4,  val: true, notif: true,  legal: true, proto: null },
      { nome: 'Surto ou crise de saúde mental',              sev: 4, sla: 24, val: true, notif: true,  legal: true, proto: null },
      { nome: 'Acidente ou lesão física na escola',          sev: 3, sla: 48, val: false, notif: true, legal: true, proto: null },
      { nome: 'Suspeita de uso de substâncias',              sev: 4, sla: 24, val: true, notif: true,  legal: false, proto: null },
      { nome: 'Problema de saúde que compromete frequência', sev: 2, sla: 72, val: false, notif: true, legal: false, proto: null },
    ],
  },
  {
    nome: 'Uso de Tecnologia', sev: 1, sla: 120, val: false, notif: false, legal: false,
    subs: [
      { nome: 'Uso de celular em sala durante aula',          sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
      { nome: 'Acesso a conteúdo impróprio na rede escolar',  sev: 3, sla: 48,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Gravação não autorizada de aula ou colegas',   sev: 3, sla: 48,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Compartilhamento indevido de dados de colegas',sev: 4, sla: 24,  val: true,  notif: true,  legal: false, proto: null },
      { nome: 'Uso indevido de credenciais institucionais',   sev: 3, sla: 48,  val: true,  notif: false, legal: false, proto: null },
    ],
  },
  {
    nome: 'Comportamento e Convivência', sev: 1, sla: 120, val: false, notif: false, legal: false,
    subs: [
      { nome: 'Comportamento perturbador em sala',       sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
      { nome: 'Linguagem inadequada',                    sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
      { nome: 'Desorganização do espaço de uso coletivo',sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
      { nome: 'Conflito interpessoal sem agressão',      sev: 2, sla: 72,  val: false, notif: false, legal: false, proto: null },
      { nome: 'Descumprimento do uniforme escolar',      sev: 1, sla: 120, val: false, notif: false, legal: false, proto: null },
    ],
  },
];

// ─── Prompt interativo ─────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => { rl.close(); resolve(answer.trim()); }));
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  Radar Acadêmico — Seed de Produção           ');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  await AppDataSource.initialize();
  const q = AppDataSource.createQueryRunner();
  await q.connect();

  // ── Garantir tabela codigo_sequencia ────────────────────────────────────────
  await q.query(`
    CREATE TABLE IF NOT EXISTS codigo_sequencia (
      ano        INT        NOT NULL,
      segmento   VARCHAR(2) NOT NULL,
      ultimo_seq INT        NOT NULL DEFAULT 0,
      PRIMARY KEY (ano, segmento)
    )
  `);

  // ── Verificar se categorias já existem ─────────────────────────────────────
  const [{ total: totalCats }] = await q.query(`SELECT COUNT(*) AS total FROM categorias_ocorrencia`);
  const categoriasExistem = Number(totalCats) > 0;

  if (categoriasExistem) {
    console.log('ℹ️  Categorias já existem — pulando inserção de categorias.');
  } else {
    console.log('📋 Inserindo categorias e subcategorias...');
    await q.startTransaction();
    try {
      for (const c of CATEGORIAS) {
        const catId = crypto.randomUUID();
        await q.query(
          `INSERT IGNORE INTO categorias_ocorrencia
             (id, nome, severidade_padrao, sla_horas, exige_notif_responsavel,
              obrigatorio_legal, segmentos_aplicaveis, exige_validacao, ativo)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [catId, c.nome, c.sev, c.sla, c.notif ? 1 : 0, c.legal ? 1 : 0, SEGS_ALL, c.val ? 1 : 0],
        );
        const [catRow] = await q.query(
          `SELECT id FROM categorias_ocorrencia WHERE nome = ? LIMIT 1`, [c.nome],
        );
        const realCatId: string = catRow?.id ?? catId;
        for (const s of c.subs) {
          await q.query(
            `INSERT IGNORE INTO subcategorias_ocorrencia
               (id, categoria_id, nome, severidade_padrao, sla_horas,
                exige_validacao, exige_notif_responsavel, obrigatorio_legal,
                protocolo_externo, ativo)
             VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [realCatId, s.nome, s.sev, s.sla, s.val ? 1 : 0, s.notif ? 1 : 0, s.legal ? 1 : 0, s.proto],
          );
        }
      }
      await q.commitTransaction();
      console.log(`   ✅ ${CATEGORIAS.length} categorias inseridas`);
    } catch (err) {
      await q.rollbackTransaction();
      throw err;
    }
  }

  // ── Criar primeiro usuário ADMIN ────────────────────────────────────────────
  const [{ total: totalAdmins }] = await q.query(
    `SELECT COUNT(*) AS total FROM usuarios WHERE perfil = 'ADMIN'`,
  );

  if (Number(totalAdmins) > 0) {
    console.log('ℹ️  Usuário ADMIN já existe — pulando criação do admin.');
  } else {
    console.log('');
    console.log('👤 Nenhum usuário ADMIN encontrado. Criando o primeiro administrador.');
    console.log('   (Este usuário receberá o magic link de acesso ao sistema)');
    console.log('');

    const nome   = await prompt('   Nome completo do administrador: ');
    const email  = await prompt('   E-mail institucional: ');
    const campus = await prompt('   Campus principal [ex: Campus A]: ');

    if (!nome || !email || !campus) {
      console.error('\n❌ Nome, e-mail e campus são obrigatórios.');
      process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`\n❌ E-mail inválido: ${email}`);
      process.exit(1);
    }

    const segmentos = JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']);
    await q.query(
      `INSERT INTO usuarios (id, nome, email, cpf_encriptado, perfil, campus, segmentos_responsaveis, ativo)
       VALUES (UUID(), ?, ?, '', 'ADMIN', ?, ?, 1)`,
      [nome, email, campus, segmentos],
    );

    console.log('');
    console.log(`   ✅ Administrador criado: ${nome} <${email}>`);
    console.log('   ℹ️  Para acessar o sistema, solicite um magic link na tela de login.');
  }

  await q.release();
  await AppDataSource.destroy();

  console.log('');
  console.log('✅ Seed de produção concluído!');
  console.log('');
  console.log('Próximos passos:');
  console.log('  1. Configure o domínio e HTTPS no nginx');
  console.log('  2. Acesse o sistema e crie os demais usuários (ADMIN → /admin/usuarios)');
  console.log('  3. Configure as turmas e alunos da instituição');
  console.log('');
}

seed().catch(err => {
  console.error('\n❌ Seed falhou:', err);
  process.exit(1);
});
