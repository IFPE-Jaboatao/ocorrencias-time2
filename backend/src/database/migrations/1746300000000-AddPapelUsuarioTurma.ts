import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPapelUsuarioTurma1746300000000 implements MigrationInterface {
  name = 'AddPapelUsuarioTurma1746300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const rows: any[] = await queryRunner.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME   = 'usuario_turmas'
         AND COLUMN_NAME  = 'papel'`
    );
    if (rows.length === 0) {
      await queryRunner.query(
        `ALTER TABLE usuario_turmas
         ADD COLUMN papel ENUM('PROFESSOR','COORDENADOR_TURMA') NOT NULL DEFAULT 'PROFESSOR'`
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE usuario_turmas DROP COLUMN papel`);
  }
}
