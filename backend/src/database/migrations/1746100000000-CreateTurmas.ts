import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTurmas1746100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS turmas (
        id          VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        nome        VARCHAR(100) NOT NULL,
        segmento    ENUM('FUNDAMENTAL','MEDIO','SUPERIOR') NOT NULL,
        campus      VARCHAR(100) NOT NULL,
        curso       VARCHAR(255) NOT NULL,
        ano_letivo  INT          NOT NULL,
        turno       ENUM('MANHA','TARDE','NOITE','INTEGRAL') NULL,
        ativo       TINYINT(1)   NOT NULL DEFAULT 1,
        criado_em   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_turmas_contexto (campus, segmento, curso, nome, ano_letivo)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS usuario_turmas (
        usuario_id  VARCHAR(36)  NOT NULL,
        turma_id    VARCHAR(36)  NOT NULL,
        ativo       TINYINT(1)   NOT NULL DEFAULT 1,
        criado_em   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (usuario_id, turma_id),
        CONSTRAINT fk_ut_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_ut_turma   FOREIGN KEY (turma_id)   REFERENCES turmas(id)   ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS usuario_turmas`);
    await queryRunner.query(`DROP TABLE IF EXISTS turmas`);
  }
}
