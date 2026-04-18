import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration inicial — cria todas as tabelas base do RadarAcadêmico.
 * Executa em ordem para respeitar foreign keys.
 */
export class InitialSchema1713400000000 implements MigrationInterface {
  name = 'InitialSchema1713400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─── tenants ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE tenants (
        id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        name        VARCHAR(255)  NOT NULL,
        features    JSON          NOT NULL DEFAULT ('[]'),
        plan        VARCHAR(50)   NOT NULL DEFAULT 'basic',
        is_active   TINYINT(1)    NOT NULL DEFAULT 1,
        created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE users (
        id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id   VARCHAR(36)   NOT NULL,
        email       VARCHAR(255)  NOT NULL,
        name        VARCHAR(255)  NOT NULL,
        roles       JSON          NOT NULL DEFAULT ('[]'),
        is_active   TINYINT(1)    NOT NULL DEFAULT 1,
        deleted_at  DATETIME(6)   NULL,
        created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_users_email_tenant (email, tenant_id),
        CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── magic_link_tokens ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE magic_link_tokens (
        id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        user_id     VARCHAR(36)   NOT NULL,
        token_hash  VARCHAR(255)  NOT NULL,
        expires_at  DATETIME      NOT NULL,
        used_at     DATETIME      NULL,
        created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_mlt_token_hash (token_hash),
        CONSTRAINT fk_mlt_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── refresh_tokens ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        user_id     VARCHAR(36)   NOT NULL,
        token_hash  VARCHAR(255)  NOT NULL,
        expires_at  DATETIME      NOT NULL,
        revoked_at  DATETIME      NULL,
        created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_rt_token_hash (token_hash),
        CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── students ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE students (
        id                  VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id           VARCHAR(36)   NOT NULL,
        user_id             VARCHAR(36)   NULL,
        name                VARCHAR(255)  NOT NULL,
        registration_number VARCHAR(50)   NOT NULL,
        birth_date          DATE          NOT NULL,
        is_minor            TINYINT(1)    NOT NULL DEFAULT 0,
        education_level     VARCHAR(50)   NOT NULL,
        class_name          VARCHAR(100)  NULL,
        campus              VARCHAR(100)  NULL,
        academic_period_id  VARCHAR(36)   NULL,
        deleted_at          DATETIME(6)   NULL,
        created_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at          DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_students_reg_tenant (registration_number, tenant_id),
        CONSTRAINT fk_students_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
        CONSTRAINT fk_students_user   FOREIGN KEY (user_id)   REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── guardians ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE guardians (
        id           VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        user_id      VARCHAR(36)   NULL,
        name         VARCHAR(255)  NOT NULL,
        email        VARCHAR(255)  NOT NULL,
        phone        VARCHAR(20)   NULL,
        relationship VARCHAR(50)   NOT NULL,
        created_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at   DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_guardians_user FOREIGN KEY (user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── guardian_students (N:M) ──────────────────────────────────────────────
    // H-03: um responsável pode ter vários alunos, um aluno pode ter vários responsáveis
    await queryRunner.query(`
      CREATE TABLE guardian_students (
        guardian_id VARCHAR(36)  NOT NULL,
        student_id  VARCHAR(36)  NOT NULL,
        is_active   TINYINT(1)   NOT NULL DEFAULT 1,
        created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (guardian_id, student_id),
        CONSTRAINT fk_gs_guardian FOREIGN KEY (guardian_id) REFERENCES guardians(id),
        CONSTRAINT fk_gs_student  FOREIGN KEY (student_id)  REFERENCES students(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── occurrence_types ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE occurrence_types (
        id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id        VARCHAR(36)   NOT NULL,
        name             VARCHAR(255)  NOT NULL,
        category         VARCHAR(50)   NOT NULL,
        is_restricted    TINYINT(1)    NOT NULL DEFAULT 0,
        is_active        TINYINT(1)    NOT NULL DEFAULT 1,
        created_at       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_ot_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── occurrence_subtypes ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE occurrence_subtypes (
        id               VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        type_id          VARCHAR(36)   NOT NULL,
        name             VARCHAR(255)  NOT NULL,
        is_grave         TINYINT(1)    NOT NULL DEFAULT 0,
        is_active        TINYINT(1)    NOT NULL DEFAULT 1,
        created_at       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at       DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_ost_type FOREIGN KEY (type_id) REFERENCES occurrence_types(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── academic_periods ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE academic_periods (
        id          VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id   VARCHAR(36)   NOT NULL,
        name        VARCHAR(100)  NOT NULL,
        start_date  DATE          NOT NULL,
        end_date    DATE          NOT NULL,
        is_active   TINYINT(1)    NOT NULL DEFAULT 1,
        created_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at  DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_ap_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── occurrences ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE occurrences (
        id                     VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id              VARCHAR(36)   NOT NULL,
        protocol               VARCHAR(30)   NOT NULL,
        type_id                VARCHAR(36)   NOT NULL,
        subtype_id             VARCHAR(36)   NOT NULL,
        student_id             VARCHAR(36)   NOT NULL,
        author_id              VARCHAR(36)   NOT NULL,
        status                 VARCHAR(30)   NOT NULL DEFAULT 'RASCUNHO',
        description            TEXT          NOT NULL,
        urgency                VARCHAR(10)   NOT NULL DEFAULT 'BAIXA',
        academic_period_id     VARCHAR(36)   NULL,
        occurrence_date        DATETIME      NOT NULL,
        annulled_at            DATETIME(6)   NULL,
        annulled_by_id         VARCHAR(36)   NULL,
        annulled_justification TEXT          NULL,
        created_at             DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        updated_at             DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_protocol (protocol),
        CONSTRAINT fk_occ_tenant   FOREIGN KEY (tenant_id)          REFERENCES tenants(id),
        CONSTRAINT fk_occ_type     FOREIGN KEY (type_id)            REFERENCES occurrence_types(id),
        CONSTRAINT fk_occ_subtype  FOREIGN KEY (subtype_id)         REFERENCES occurrence_subtypes(id),
        CONSTRAINT fk_occ_student  FOREIGN KEY (student_id)         REFERENCES students(id),
        CONSTRAINT fk_occ_author   FOREIGN KEY (author_id)          REFERENCES users(id),
        CONSTRAINT fk_occ_annulled FOREIGN KEY (annulled_by_id)     REFERENCES users(id),
        CONSTRAINT fk_occ_period   FOREIGN KEY (academic_period_id) REFERENCES academic_periods(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── protocol_sequences (H-02: geração com lock) ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE protocol_sequences (
        tenant_id   VARCHAR(36) NOT NULL,
        year        SMALLINT    NOT NULL,
        last_seq    INT         NOT NULL DEFAULT 0,
        PRIMARY KEY (tenant_id, year),
        CONSTRAINT fk_ps_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── occurrence_history (H-04: apenas INSERT) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE occurrence_history (
        id               VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        occurrence_id    VARCHAR(36)  NOT NULL,
        previous_status  VARCHAR(30)  NULL,
        new_status       VARCHAR(30)  NOT NULL,
        author_id        VARCHAR(36)  NOT NULL,
        comment          TEXT         NULL,
        created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_oh_occurrence FOREIGN KEY (occurrence_id) REFERENCES occurrences(id),
        CONSTRAINT fk_oh_author     FOREIGN KEY (author_id)     REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── occurrence_attachments ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE occurrence_attachments (
        id             VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        occurrence_id  VARCHAR(36)   NOT NULL,
        original_name  VARCHAR(255)  NOT NULL,
        stored_name    VARCHAR(255)  NOT NULL,
        mime_type      VARCHAR(100)  NOT NULL,
        size_bytes     INT           NOT NULL,
        uploaded_by_id VARCHAR(36)   NOT NULL,
        created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_oa_occurrence FOREIGN KEY (occurrence_id)  REFERENCES occurrences(id),
        CONSTRAINT fk_oa_user       FOREIGN KEY (uploaded_by_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── audit_logs (apenas INSERT — RNF-03 / RN-08) ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id            VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        tenant_id     VARCHAR(36)   NULL,
        entity_type   VARCHAR(100)  NOT NULL,
        entity_id     VARCHAR(36)   NOT NULL,
        user_id       VARCHAR(36)   NOT NULL,
        action        VARCHAR(100)  NOT NULL,
        ip_address    VARCHAR(45)   NULL,
        justification TEXT          NULL,
        metadata      JSON          NULL,
        created_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_al_entity  (entity_type, entity_id),
        INDEX idx_al_user    (user_id),
        INDEX idx_al_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // ─── notification_logs ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE notification_logs (
        id             VARCHAR(36)   NOT NULL DEFAULT (UUID()),
        type           VARCHAR(50)   NOT NULL,
        recipient_id   VARCHAR(36)   NULL,
        occurrence_id  VARCHAR(36)   NULL,
        subject        VARCHAR(255)  NOT NULL,
        body           TEXT          NOT NULL,
        sent_at        DATETIME(6)   NULL,
        error          TEXT          NULL,
        created_at     DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        INDEX idx_nl_occurrence (occurrence_id),
        CONSTRAINT fk_nl_occurrence FOREIGN KEY (occurrence_id) REFERENCES occurrences(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS notification_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_logs`);
    await queryRunner.query(`DROP TABLE IF EXISTS occurrence_attachments`);
    await queryRunner.query(`DROP TABLE IF EXISTS occurrence_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS protocol_sequences`);
    await queryRunner.query(`DROP TABLE IF EXISTS occurrences`);
    await queryRunner.query(`DROP TABLE IF EXISTS academic_periods`);
    await queryRunner.query(`DROP TABLE IF EXISTS occurrence_subtypes`);
    await queryRunner.query(`DROP TABLE IF EXISTS occurrence_types`);
    await queryRunner.query(`DROP TABLE IF EXISTS guardian_students`);
    await queryRunner.query(`DROP TABLE IF EXISTS guardians`);
    await queryRunner.query(`DROP TABLE IF EXISTS students`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS magic_link_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants`);
  }
}
