import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubcategorias1746200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS subcategorias_ocorrencia (
        id                       VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        categoria_id             VARCHAR(36)  NOT NULL,
        nome                     VARCHAR(100) NOT NULL,
        severidade_padrao        TINYINT      NOT NULL,
        sla_horas                INT          NOT NULL,
        exige_validacao          TINYINT(1)   NOT NULL DEFAULT 0,
        exige_notif_responsavel  TINYINT(1)   NOT NULL DEFAULT 0,
        obrigatorio_legal        TINYINT(1)   NOT NULL DEFAULT 0,
        protocolo_externo        VARCHAR(100) NULL,
        ativo                    TINYINT(1)   NOT NULL DEFAULT 1,
        criado_em                DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_subcat_nome (categoria_id, nome),
        CONSTRAINT fk_subcat_categoria FOREIGN KEY (categoria_id)
          REFERENCES categorias_ocorrencia(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      ALTER TABLE ocorrencias
        ADD COLUMN subcategoria_id VARCHAR(36) NULL AFTER subcategoria,
        ADD CONSTRAINT fk_oc_subcategoria
          FOREIGN KEY (subcategoria_id) REFERENCES subcategorias_ocorrencia(id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE ocorrencias DROP FOREIGN KEY fk_oc_subcategoria`);
    await queryRunner.query(`ALTER TABLE ocorrencias DROP COLUMN subcategoria_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS subcategorias_ocorrencia`);
  }
}
