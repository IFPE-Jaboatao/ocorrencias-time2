import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPapelUsuarioTurma1746300000000 implements MigrationInterface {
  name = 'AddPapelUsuarioTurma1746300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE usuario_turmas
       ADD COLUMN IF NOT EXISTS papel ENUM('PROFESSOR','COORDENADOR_TURMA') NOT NULL DEFAULT 'PROFESSOR'`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuario_turmas DROP COLUMN papel`);
  }
}
