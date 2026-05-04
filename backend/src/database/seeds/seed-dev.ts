/**
 * Seed de desenvolvimento — popula o banco sgoa com dados mínimos para teste local.
 * Executa com: npm run seed:dev
 * Executar APÓS migration:run.
 */
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import * as crypto from 'crypto';

async function seed() {
  await AppDataSource.initialize();
  const q = AppDataSource.createQueryRunner();
  await q.connect();
  await q.startTransaction();

  try {
    // ── Usuários de teste ──────────────────────────────────────────────────
    const usuarios = [
      { nome: 'Professor Teste',    email: 'professor@escola.edu.br',   perfil: 'PROFESSOR',    campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL']) },
      { nome: 'Coordenador Teste',  email: 'coordenador@escola.edu.br', perfil: 'COORDENADOR',  campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO']) },
      { nome: 'Diretor Teste',      email: 'diretor@escola.edu.br',     perfil: 'DIRETOR',       campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']) },
      { nome: 'Administrador',      email: 'admin@escola.edu.br',       perfil: 'ADMIN',          campus: 'Campus A', segmentos: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']) },
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
        nome: 'Disciplinar', subcategorias: JSON.stringify(['Agressão física', 'Bullying/Cyberbullying', 'Porte de objeto perigoso', 'Desrespeito a professor']),
        severidade_padrao: 3, sla_horas: 48, exige_notif_responsavel: 1,
        obrigatorio_legal: 0, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 1,
      },
      {
        nome: 'Acadêmica', subcategorias: JSON.stringify(['Plágio/Desonestidade', 'Infrequência crítica (>25%)', 'Reprovação por falta']),
        severidade_padrao: 2, sla_horas: 72, exige_notif_responsavel: 1,
        obrigatorio_legal: 0, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 0,
      },
      {
        nome: 'Saúde/Bem-estar', subcategorias: JSON.stringify(['Suspeita de violência doméstica', 'Automutilação / risco', 'Problema de saúde grave']),
        severidade_padrao: 4, sla_horas: 24, exige_notif_responsavel: 1,
        obrigatorio_legal: 1, segmentos_aplicaveis: JSON.stringify(['FUNDAMENTAL', 'MEDIO', 'SUPERIOR']), exige_validacao: 1,
      },
      {
        nome: 'Comportamental', subcategorias: JSON.stringify(['Uso de celular em aula', 'Vocabulário inadequado', 'Comportamento perturbador']),
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
    const alunos = [
      {
        matricula: '2026FM0001', nome: 'Lucas Oliveira', data_nascimento: '2013-05-10',
        segmento: 'FUNDAMENTAL', campus: 'Campus A', curso: 'Ensino Fundamental', turma: '8A',
        cpf_enc: encryptFake('111.111.111-11'),
      },
      {
        matricula: '2026ME0001', nome: 'Ana Paula Souza', data_nascimento: '2007-11-22',
        segmento: 'MEDIO', campus: 'Campus A', curso: 'Ensino Médio', turma: '3B',
        cpf_enc: encryptFake('222.222.222-22'),
      },
      {
        matricula: '2026SU0001', nome: 'Carlos Eduardo Lima', data_nascimento: '2002-03-15',
        segmento: 'SUPERIOR', campus: 'Campus A', curso: 'Tecnologia em Análise e Desenvolvimento de Sistemas', turma: '2024.1',
        cpf_enc: encryptFake('333.333.333-33'),
      },
    ];

    const alunoIds: Record<string, string> = {};
    for (const a of alunos) {
      const id = crypto.randomUUID();
      alunoIds[a.matricula] = id;
      await q.query(
        `INSERT IGNORE INTO alunos (id, matricula, nome, data_nascimento, cpf_encriptado, segmento, campus, curso, turma, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ATIVO')`,
        [id, a.matricula, a.nome, a.data_nascimento, a.cpf_enc, a.segmento, a.campus, a.curso, a.turma],
      );
    }

    // ── Responsáveis legais (para alunos menores) ──────────────────────────
    const responsaveis = [
      { alunoMatricula: '2026FM0001', nome: 'Maria Oliveira',   parentesco: 'Mãe',  email: 'maria.oliveira@gmail.com',   telefone: '81999990001' },
      { alunoMatricula: '2026ME0001', nome: 'Roberto Souza',    parentesco: 'Pai',  email: 'roberto.souza@gmail.com',    telefone: '81999990002' },
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

    await q.commitTransaction();
    console.log('✓ Seed concluído com sucesso.');
    console.log('');
    console.log('Usuários criados:');
    console.log('  professor@escola.edu.br   → PROFESSOR   / Campus A');
    console.log('  coordenador@escola.edu.br → COORDENADOR / Campus A');
    console.log('  diretor@escola.edu.br     → DIRETOR     / Campus A');
    console.log('  admin@escola.edu.br       → ADMIN       / Campus A');
    console.log('');
    console.log('Para receber o magic link, certifique-se de que SMTP está configurado no .env');
  } catch (err) {
    await q.rollbackTransaction();
    console.error('✗ Seed falhou:', err);
    process.exit(1);
  } finally {
    await q.release();
    await AppDataSource.destroy();
  }
}

function encryptFake(cpf: string): string {
  // Placeholder — em produção usa CryptoService (AES-256-GCM). No seed apenas marca o campo.
  return `SEED_ENC:${Buffer.from(cpf).toString('base64')}`;
}

seed();
