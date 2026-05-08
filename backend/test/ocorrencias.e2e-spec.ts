import { INestApplication } from '@nestjs/common';
import request              from 'supertest';
import { DataSource }       from 'typeorm';
import { createTestApp, gerarToken } from './helpers/create-test-app';
import { seedTestData, SeedResult } from './helpers/seed';
import { PerfilUsuario }    from '../src/common/enums/perfil-usuario.enum';
import { Segmento }         from '../src/common/enums/segmento.enum';

describe('Ocorrências — E2E', () => {
  let app:   INestApplication;
  let ds:    DataSource;
  let seeds: SeedResult;

  // Tokens dos perfis mais utilizados
  let tokenProfessor:   string;
  let tokenCoordenador: string;
  let tokenCoordenadorB: string;
  let tokenDiretor:     string;
  let tokenAdmin:       string;

  beforeAll(async () => {
    app    = await createTestApp();
    ds     = app.get(DataSource);

    // Limpar dados transacionais de suites anteriores para garantir
    // que o contador de codigo_sequencia comece do zero para esta suite
    await ds.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const t of ['validacoes_ocorrencia', 'encaminhamentos', 'notificacoes',
                     'comentarios', 'ciencias_formais', 'auditorias',
                     'ocorrencias', 'codigo_sequencia']) {
      await ds.query(`TRUNCATE TABLE \`${t}\``).catch(() => {});
    }
    await ds.query('SET FOREIGN_KEY_CHECKS = 1');

    seeds  = await seedTestData(ds);

    tokenProfessor    = gerarToken(app, { sub: seeds.professor.id,    email: seeds.professor.email,    perfil: PerfilUsuario.PROFESSOR,    campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenCoordenador  = gerarToken(app, { sub: seeds.coordenador.id,  email: seeds.coordenador.email,  perfil: PerfilUsuario.COORDENADOR,  campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenCoordenadorB = gerarToken(app, { sub: seeds.coordenadorB.id, email: seeds.coordenadorB.email, perfil: PerfilUsuario.COORDENADOR,  campus: 'Campus B', segmentos: [Segmento.FUNDAMENTAL] });
    tokenDiretor      = gerarToken(app, { sub: seeds.diretor.id,      email: seeds.diretor.email,      perfil: PerfilUsuario.DIRETOR,      campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
    tokenAdmin        = gerarToken(app, { sub: seeds.admin.id,        email: seeds.admin.email,        perfil: PerfilUsuario.ADMIN,        campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /ocorrencias ───────────────────────────────────────────────────────

  describe('POST /api/v1/ocorrencias', () => {
    const baseDto = () => ({
      alunoId:       '',
      categoriaId:   '',
      severidade:    2,
      dataIncidente: '2026-04-15',
      local:         'Sala 204 — Bloco B',
      descricao:     'Descrição detalhada do incidente ocorrido durante a aula.',
    });

    it('201 — professor registra ocorrência no seu campus', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id };

      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('codigo');
      expect(res.body.codigo).toMatch(/^OC-\d{4}-\d{5}-/);
      expect(res.body.severidade).toBe(2);
    });

    it('401 sem token', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id };
      await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .send(dto)
        .expect(401);
    });

    it('403 — perfil ADMIN não pode registrar ocorrência', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id };
      await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(dto)
        .expect(403);
    });

    it('400 — severidade fora do range (> 5)', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id, severidade: 6 };
      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('severidade');
    });

    it('400 — descrição muito curta (< 20 chars)', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id, descricao: 'Curta demais' };
      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('descricao');
    });

    it('400 — alunoId inválido (não UUID)', async () => {
      const dto = { ...baseDto(), alunoId: 'nao-e-uuid', categoriaId: seeds.categoria.id };
      await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(400);
    });

    it('sev ≥ 4 → status AGUARDANDO_VALIDACAO (P-03)', async () => {
      const dto = { ...baseDto(), alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id, severidade: 4 };

      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(dto)
        .expect(201);

      expect(res.body.status).toBe('AGUARDANDO_VALIDACAO');
    });
  });

  // ─── GET /ocorrencias ────────────────────────────────────────────────────────

  describe('GET /api/v1/ocorrencias', () => {
    it('200 — professor vê suas próprias ocorrências', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('200 — coordenador vê ocorrências do seu campus', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('H-08 — coordenador Campus B não vê ocorrências do Campus A', async () => {
      // Registrar uma ocorrência no Campus A
      const dto = {
        alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id,
        severidade: 1, dataIncidente: '2026-04-15',
        local: 'Campus A', descricao: 'Ocorrência registrada no campus A para teste de escopo.',
      };
      await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(201);

      // Coordenador do Campus B não deve ver
      const res = await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenCoordenadorB}`)
        .expect(200);

      const ids = res.body.data.map((o: any) => o.id);
      // Nenhuma ocorrência do Campus A deve aparecer
      const ocorrenciasCampusA = res.body.data.filter((o: any) => o.aluno?.campus === 'Campus A');
      expect(ocorrenciasCampusA).toHaveLength(0);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .expect(401);
    });
  });

  // ─── GET /ocorrencias/:id ────────────────────────────────────────────────────

  describe('GET /api/v1/ocorrencias/:id', () => {
    let ocorrenciaId: string;

    beforeAll(async () => {
      const dto = {
        alunoId: seeds.alunoMenor.id, categoriaId: seeds.categoria.id,
        severidade: 1, dataIncidente: '2026-04-20',
        local: 'Corredor Bloco C', descricao: 'Incidente observado durante o recreio na área externa.',
      };
      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(dto)
        .expect(201);
      ocorrenciaId = res.body.id;
    });

    it('200 — professor visualiza ocorrência que ele mesmo registrou', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(200);

      expect(res.body.id).toBe(ocorrenciaId);
    });

    it('200 — coordenador do mesmo campus visualiza ocorrência', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(res.body.id).toBe(ocorrenciaId);
    });

    it('C-02 — coordenador de outro campus NÃO pode visualizar a ocorrência → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}`)
        .set('Authorization', `Bearer ${tokenCoordenadorB}`)
        .expect(403);
    });

    it('200 — diretor pode visualizar ocorrência de qualquer campus', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}`)
        .set('Authorization', `Bearer ${tokenDiretor}`)
        .expect(200);

      expect(res.body.id).toBe(ocorrenciaId);
    });

    it('404 — ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ocorrencias/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(404);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}`)
        .expect(401);
    });
  });

  // ─── PATCH /ocorrencias/:id/status ──────────────────────────────────────────

  describe('PATCH /api/v1/ocorrencias/:id/status', () => {
    let ocorrenciaId: string;

    beforeAll(async () => {
      const dto = {
        alunoId: seeds.alunoMaior.id, categoriaId: seeds.categoria.id,
        severidade: 2, dataIncidente: '2026-04-22',
        local: 'Biblioteca', descricao: 'Ocorrência na biblioteca para teste de mudança de status.',
      };
      const res = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(dto)
        .expect(201);
      ocorrenciaId = res.body.id;
    });

    it('200 — coordenador move ABERTA → EM_ACOMPANHAMENTO', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${ocorrenciaId}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Acompanhamento iniciado.' })
        .expect(200);

      expect(res.body.status).toBe('EM_ACOMPANHAMENTO');
    });

    it('403 — professor não pode alterar status', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${ocorrenciaId}/status`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send({ status: 'RESOLVIDA' })
        .expect(403);
    });

    it('400 — transição inválida (EM_ACOMPANHAMENTO → ABERTA — P-03)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${ocorrenciaId}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'ABERTA' })
        .expect(400);
    });

    it('RN-12 — ocorrência ARQUIVADA é read-only → 403', async () => {
      // Criar e arquivar uma ocorrência (ABERTA → EM_ACOMPANHAMENTO → RESOLVIDA → ARQUIVADA)
      const dto = {
        alunoId: seeds.alunoMaior.id, categoriaId: seeds.categoria.id,
        severidade: 1, dataIncidente: '2026-04-23',
        local: 'Secretaria', descricao: 'Ocorrência para testar arquivamento e read-only.',
      };
      const criado = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias').set('Authorization', `Bearer ${tokenCoordenador}`).send(dto).expect(201);
      const id = criado.body.id;

      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Iniciando acompanhamento.' }).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'RESOLVIDA', justificativa: 'Resolvido.' }).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'ARQUIVADA' }).expect(200);

      // Tentativa de alterar ocorrência arquivada → 403
      await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Tentativa de reabrir arquivada.' })
        .expect(403);
    });

    it('RN-04 — coordenador NÃO pode reabrir ocorrência RESOLVIDA → 403', async () => {
      const dto = {
        alunoId: seeds.alunoMaior.id, categoriaId: seeds.categoria.id,
        severidade: 1, dataIncidente: '2026-04-24',
        local: 'Laboratório', descricao: 'Ocorrência para testar restrição de reabertura pelo coordenador.',
      };
      const criado = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias').set('Authorization', `Bearer ${tokenCoordenador}`).send(dto).expect(201);
      const id = criado.body.id;

      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Acompanhamento iniciado.' }).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'RESOLVIDA' }).expect(200);

      // Coordenador tenta reabrir → 403
      await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Coordenador tentando reabrir.' })
        .expect(403);
    });

    it('RN-04 — admin PODE reabrir ocorrência RESOLVIDA com justificativa → 200', async () => {
      const dto = {
        alunoId: seeds.alunoMaior.id, categoriaId: seeds.categoria.id,
        severidade: 1, dataIncidente: '2026-04-25',
        local: 'Refeitório', descricao: 'Ocorrência para testar reabertura autorizada pelo admin.',
      };
      const criado = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias').set('Authorization', `Bearer ${tokenCoordenador}`).send(dto).expect(201);
      const id = criado.body.id;

      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Iniciando.' }).expect(200);
      await request(app.getHttpServer()).patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ status: 'RESOLVIDA' }).expect(200);

      // Admin reabre com justificativa → 200
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/ocorrencias/${id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'EM_ACOMPANHAMENTO', justificativa: 'Reabertura autorizada pelo administrador para revisão.' })
        .expect(200);

      expect(res.body.status).toBe('EM_ACOMPANHAMENTO');
    });
  });

  // ─── GET /ocorrencias/alunos/:alunoId/reincidencias ─────────────────────────

  describe('GET /api/v1/ocorrencias/alunos/:alunoId/reincidencias', () => {
    it('200 — coordenador do mesmo campus pode verificar reincidências', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/alunos/${seeds.alunoMenor.id}/reincidencias`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalNoPeriodo');
      expect(res.body).toHaveProperty('reincidente');
      expect(res.body).toHaveProperty('categorias');
    });

    it('200 — diretor pode verificar reincidências de qualquer campus', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/alunos/${seeds.alunoMenor.id}/reincidencias`)
        .set('Authorization', `Bearer ${tokenDiretor}`)
        .expect(200);

      expect(res.body).toHaveProperty('totalNoPeriodo');
    });

    it('403 — professor não tem perfil para acessar reincidências (guard @Roles)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/alunos/${seeds.alunoMenor.id}/reincidencias`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(403);
    });

    it('C-01 — coordenador de outro campus NÃO pode verificar reincidências → 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/alunos/${seeds.alunoMenor.id}/reincidencias`)
        .set('Authorization', `Bearer ${tokenCoordenadorB}`)
        .expect(403);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/alunos/${seeds.alunoMenor.id}/reincidencias`)
        .expect(401);
    });
  });
});
