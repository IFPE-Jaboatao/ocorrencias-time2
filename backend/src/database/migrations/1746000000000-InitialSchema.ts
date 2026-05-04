import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1746000000000 implements MigrationInterface {
  name = 'InitialSchema1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE usuarios (
        id                      VARCHAR(36)  NOT NULL,
        nome                    VARCHAR(255) NOT NULL,
        email                   VARCHAR(255) NOT NULL UNIQUE,
        cpf_encriptado          VARCHAR(512) NULL,
        perfil                  ENUM('PROFESSOR','COORDENADOR','EQUIPE_PEDAGOGICA','DIRETOR','SECRETARIA','ADMIN','ALUNO','RESPONSAVEL_LEGAL') NOT NULL,
        campus                  VARCHAR(100) NOT NULL,
        segmentos_responsaveis  JSON         NOT NULL DEFAULT (JSON_ARRAY()),
        ativo                   TINYINT(1)   NOT NULL DEFAULT 1,
        ultimo_acesso           DATETIME     NULL,
        criado_em               DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        atualizado_em           DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE magic_link_tokens (
        id          VARCHAR(36)  NOT NULL,
        usuario_id  VARCHAR(36)  NOT NULL,
        token_hash  VARCHAR(64)  NOT NULL,
        expires_at  DATETIME     NOT NULL,
        used_at     DATETIME     NULL,
        criado_em   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_token_hash (token_hash),
        CONSTRAINT fk_mlt_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id           VARCHAR(36)  NOT NULL,
        usuario_id   VARCHAR(36)  NOT NULL,
        token_hash   VARCHAR(64)  NOT NULL,
        expires_at   DATETIME     NOT NULL,
        revoked_at   DATETIME     NULL,
        criado_em    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        UNIQUE KEY uq_refresh_hash (token_hash),
        CONSTRAINT fk_rt_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE alunos (
        id               VARCHAR(36)  NOT NULL,
        matricula        VARCHAR(50)  NOT NULL UNIQUE,
        nome             VARCHAR(255) NOT NULL,
        data_nascimento  DATE         NOT NULL,
        cpf_encriptado   VARCHAR(512) NULL,
        foto_url         VARCHAR(500) NULL,
        segmento         ENUM('FUNDAMENTAL','MEDIO','SUPERIOR') NOT NULL,
        campus           VARCHAR(100) NOT NULL,
        curso            VARCHAR(255) NOT NULL,
        turma            VARCHAR(50)  NOT NULL,
        status           ENUM('ATIVO','INATIVO','TRANSFERIDO','FORMADO') NOT NULL DEFAULT 'ATIVO',
        criado_em        DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        atualizado_em    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE responsaveis_legais (
        id                       VARCHAR(36)  NOT NULL,
        aluno_id                 VARCHAR(36)  NOT NULL,
        nome                     VARCHAR(255) NOT NULL,
        cpf_encriptado           VARCHAR(512) NULL,
        parentesco               VARCHAR(50)  NOT NULL,
        email                    VARCHAR(255) NOT NULL,
        telefone                 VARCHAR(20)  NOT NULL,
        receber_notificacoes     TINYINT(1)   NOT NULL DEFAULT 1,
        validado_em              DATETIME     NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_resp_aluno FOREIGN KEY (aluno_id) REFERENCES alunos(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE categorias_ocorrencia (
        id                       VARCHAR(36)   NOT NULL,
        nome                     VARCHAR(255)  NOT NULL,
        subcategorias            JSON          NOT NULL DEFAULT (JSON_ARRAY()),
        severidade_padrao        TINYINT       NOT NULL DEFAULT 1,
        sla_horas                INT           NOT NULL DEFAULT 120,
        exige_notif_responsavel  TINYINT(1)    NOT NULL DEFAULT 0,
        obrigatorio_legal        TINYINT(1)    NOT NULL DEFAULT 0,
        segmentos_aplicaveis     JSON          NOT NULL DEFAULT (JSON_ARRAY()),
        exige_validacao          TINYINT(1)    NOT NULL DEFAULT 0,
        ativo                    TINYINT(1)    NOT NULL DEFAULT 1,
        protocolo_externo        VARCHAR(100)  NULL,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE codigo_sequencia (
        ano        INT         NOT NULL,
        segmento   VARCHAR(2)  NOT NULL,
        ultimo_seq INT         NOT NULL DEFAULT 0,
        PRIMARY KEY (ano, segmento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE ocorrencias (
        id                    VARCHAR(36)   NOT NULL,
        codigo                VARCHAR(30)   NOT NULL UNIQUE,
        aluno_id              VARCHAR(36)   NOT NULL,
        registrador_id        VARCHAR(36)   NOT NULL,
        categoria_id          VARCHAR(36)   NOT NULL,
        subcategoria          VARCHAR(255)  NULL,
        severidade            TINYINT       NOT NULL,
        data_incidente        DATE          NOT NULL,
        local                 VARCHAR(200)  NOT NULL,
        descricao             TEXT          NOT NULL,
        status                ENUM('ABERTA','AGUARDANDO_VALIDACAO','EM_ACOMPANHAMENTO','RESOLVIDA','ARQUIVADA','REVISAO') NOT NULL DEFAULT 'ABERTA',
        ciencia_formal_status ENUM('PENDENTE','ENVIADA','CONFIRMADA','EXPIRADA') NOT NULL DEFAULT 'PENDENTE',
        data_resolucao        DATETIME      NULL,
        sla_prazo             DATETIME      NULL,
        criado_em             DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        atualizado_em         DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_oc_aluno       FOREIGN KEY (aluno_id)       REFERENCES alunos(id),
        CONSTRAINT fk_oc_registrador FOREIGN KEY (registrador_id) REFERENCES usuarios(id),
        CONSTRAINT fk_oc_categoria   FOREIGN KEY (categoria_id)   REFERENCES categorias_ocorrencia(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`CREATE INDEX idx_ocorrencias_aluno       ON ocorrencias(aluno_id)`);
    await queryRunner.query(`CREATE INDEX idx_ocorrencias_status      ON ocorrencias(status)`);
    await queryRunner.query(`CREATE INDEX idx_ocorrencias_severidade  ON ocorrencias(severidade)`);
    await queryRunner.query(`CREATE INDEX idx_ocorrencias_registrador ON ocorrencias(registrador_id)`);
    await queryRunner.query(`CREATE INDEX idx_ocorrencias_criado_em   ON ocorrencias(criado_em)`);
    await queryRunner.query(`CREATE INDEX idx_ocorrencias_sla         ON ocorrencias(status, sla_prazo)`);

    await queryRunner.query(`
      CREATE TABLE validacoes_ocorrencia (
        id                  VARCHAR(36)   NOT NULL,
        ocorrencia_id       VARCHAR(36)   NOT NULL,
        validador_id        VARCHAR(36)   NOT NULL,
        tipo_decisao        ENUM('VALIDAR','DEVOLVER','ESCALAR') NOT NULL,
        justificativa       VARCHAR(1000) NOT NULL,
        data_decisao        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        severidade_anterior TINYINT       NULL,
        severidade_nova     TINYINT       NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_val_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id),
        CONSTRAINT fk_val_validador  FOREIGN KEY (validador_id)  REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE encaminhamentos (
        id                  VARCHAR(36)   NOT NULL,
        ocorrencia_id       VARCHAR(36)   NOT NULL,
        tipo                VARCHAR(100)  NOT NULL,
        responsavel_id      VARCHAR(36)   NOT NULL,
        prazo               DATE          NOT NULL,
        descricao           TEXT          NOT NULL,
        status              ENUM('PENDENTE','EXECUTADO','VENCIDO') NOT NULL DEFAULT 'PENDENTE',
        data_execucao       DATETIME      NULL,
        resultado_registrado TEXT         NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_enc_ocorrencia  FOREIGN KEY (ocorrencia_id)  REFERENCES ocorrencias(id),
        CONSTRAINT fk_enc_responsavel FOREIGN KEY (responsavel_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE notificacoes (
        id                VARCHAR(36)   NOT NULL,
        ocorrencia_id     VARCHAR(36)   NULL,
        destinatario_tipo VARCHAR(50)   NOT NULL,
        destinatario_id   VARCHAR(36)   NOT NULL,
        canal             ENUM('EMAIL','IN_APP') NOT NULL,
        evento            VARCHAR(100)  NOT NULL,
        status            ENUM('ENVIADO','FALHOU','LIDO') NOT NULL DEFAULT 'ENVIADO',
        data_envio        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_leitura      DATETIME      NULL,
        PRIMARY KEY (id),
        CONSTRAINT fk_not_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE INDEX idx_notificacoes_dest ON notificacoes(destinatario_id, status);
    `);

    await queryRunner.query(`
      CREATE TABLE ciencias_formais (
        id                  VARCHAR(36)  NOT NULL,
        ocorrencia_id       VARCHAR(36)  NOT NULL,
        destinatario_tipo   ENUM('ALUNO','RESPONSAVEL') NOT NULL,
        destinatario_id     VARCHAR(36)  NOT NULL,
        token_hash          VARCHAR(64)  NOT NULL,
        data_envio          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data_confirmacao    DATETIME     NULL,
        ip_confirmacao      VARCHAR(45)  NULL,
        user_agent          TEXT         NULL,
        hash_conteudo       VARCHAR(64)  NOT NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_ciencia_token (token_hash),
        CONSTRAINT fk_cf_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE comentarios (
        id             VARCHAR(36)  NOT NULL,
        ocorrencia_id  VARCHAR(36)  NOT NULL,
        autor_id       VARCHAR(36)  NULL,
        autor_nome     VARCHAR(255) NOT NULL,
        tipo           ENUM('OBSERVACAO','CONTRARRAZAO','NOTA_COMPLIANCE') NOT NULL,
        conteudo       TEXT         NOT NULL,
        confidencial   TINYINT(1)   NOT NULL DEFAULT 0,
        criado_em      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_com_ocorrencia FOREIGN KEY (ocorrencia_id) REFERENCES ocorrencias(id),
        CONSTRAINT fk_com_autor      FOREIGN KEY (autor_id)      REFERENCES usuarios(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE evidencias (
        id               VARCHAR(36)   NOT NULL,
        ocorrencia_id    VARCHAR(36)   NOT NULL,
        nome_original    VARCHAR(500)  NOT NULL,
        s3_key           VARCHAR(1000) NOT NULL,
        mime_type        VARCHAR(100)  NOT NULL,
        tamanho_bytes    INT           NOT NULL,
        enviado_por_id   VARCHAR(36)   NOT NULL,
        criado_em        DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id),
        CONSTRAINT fk_ev_ocorrencia FOREIGN KEY (ocorrencia_id)  REFERENCES ocorrencias(id),
        CONSTRAINT fk_ev_usuario    FOREIGN KEY (enviado_por_id) REFERENCES usuarios(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE auditorias (
        id           BIGINT        NOT NULL AUTO_INCREMENT,
        ocorrencia_id VARCHAR(36)  NULL,
        ator_id      VARCHAR(36)   NOT NULL,
        perfil_ator  VARCHAR(50)   NOT NULL,
        acao         VARCHAR(100)  NOT NULL,
        entidade     VARCHAR(100)  NOT NULL,
        entidade_id  VARCHAR(36)   NOT NULL,
        valor_anterior JSON        NULL,
        valor_novo     JSON        NULL,
        ip           VARCHAR(45)   NOT NULL,
        timestamp    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`CREATE INDEX idx_auditorias_ocorrencia ON auditorias(ocorrencia_id)`);
    await queryRunner.query(`CREATE INDEX idx_auditorias_ator       ON auditorias(ator_id)`);
    await queryRunner.query(`CREATE INDEX idx_auditorias_timestamp  ON auditorias(timestamp)`);

    // Triggers append-only para a tabela auditorias (H-04)
    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_audit_update
        BEFORE UPDATE ON auditorias
        FOR EACH ROW
      BEGIN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Atualizações na tabela auditorias não são permitidas (append-only)';
      END
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_prevent_audit_delete
        BEFORE DELETE ON auditorias
        FOR EACH ROW
      BEGIN
        SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Exclusões na tabela auditorias não são permitidas (append-only)';
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_audit_delete`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_prevent_audit_update`);
    await queryRunner.query(`DROP TABLE IF EXISTS auditorias`);
    await queryRunner.query(`DROP TABLE IF EXISTS evidencias`);
    await queryRunner.query(`DROP TABLE IF EXISTS comentarios`);
    await queryRunner.query(`DROP TABLE IF EXISTS ciencias_formais`);
    await queryRunner.query(`DROP TABLE IF EXISTS notificacoes`);
    await queryRunner.query(`DROP TABLE IF EXISTS encaminhamentos`);
    await queryRunner.query(`DROP TABLE IF EXISTS validacoes_ocorrencia`);
    await queryRunner.query(`DROP TABLE IF EXISTS ocorrencias`);
    await queryRunner.query(`DROP TABLE IF EXISTS codigo_sequencia`);
    await queryRunner.query(`DROP TABLE IF EXISTS categorias_ocorrencia`);
    await queryRunner.query(`DROP TABLE IF EXISTS responsaveis_legais`);
    await queryRunner.query(`DROP TABLE IF EXISTS alunos`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS magic_link_tokens`);
    await queryRunner.query(`DROP TABLE IF EXISTS usuarios`);
  }
}
