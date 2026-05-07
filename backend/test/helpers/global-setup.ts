import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export default async function globalSetup() {
  const ds = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3307),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [path.resolve(__dirname, '../../src/**/*.entity{.ts,.js}')],
    synchronize: true,
    charset: 'utf8mb4',
  });

  await ds.initialize();

  // Criar tabela auxiliar que não é uma entity TypeORM
  await ds.query(`
    CREATE TABLE IF NOT EXISTS codigo_sequencia (
      ano      INT        NOT NULL,
      segmento VARCHAR(2) NOT NULL,
      ultimo_seq INT      NOT NULL DEFAULT 0,
      PRIMARY KEY (ano, segmento)
    )
  `);

  // Limpar tabelas antes de todos os testes
  await ds.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'refresh_tokens', 'magic_link_tokens', 'ciencias_formais',
    'encaminhamentos', 'validacoes_ocorrencia', 'notificacoes',
    'comentarios', 'ocorrencias', 'codigo_sequencia',
    'aluno_responsavel', 'responsaveis', 'alunos', 'usuario_turmas', 'turmas', 'categorias_ocorrencia',
    'auditorias', 'usuarios',
  ];
  for (const t of tables) {
    await ds.query(`TRUNCATE TABLE IF EXISTS \`${t}\``).catch(() => {});
  }
  await ds.query('SET FOREIGN_KEY_CHECKS = 1');

  // Recriar tabela vazia após truncate
  await ds.query(`
    CREATE TABLE IF NOT EXISTS codigo_sequencia (
      ano      INT        NOT NULL,
      segmento VARCHAR(2) NOT NULL,
      ultimo_seq INT      NOT NULL DEFAULT 0,
      PRIMARY KEY (ano, segmento)
    )
  `);

  await ds.destroy();
}
