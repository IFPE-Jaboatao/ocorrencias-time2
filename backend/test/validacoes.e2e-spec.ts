import { INestApplication } from '@nestjs/common';
import request              from 'supertest';
import { DataSource }       from 'typeorm';
import { createTestApp, gerarToken } from './helpers/create-test-app';
import { seedTestData, SeedResult } from './helpers/seed';
import { PerfilUsuario }    from '../src/common/enums/perfil-usuario.enum';
import { Segmento }         from '../src/common/enums/segmento.enum';

/**
 * Suite E2E — Validações (RF-04)
 *
 * Cobre:
 *  - Guard @Roles: apenas COORDENADOR, DIRETOR, ADMIN podem validar
 *  - RN-08: coordenador não valida ocorrência que ele mesmo registrou
 *  - Sev 5 (Gravíssima): exige DIRETOR ou ADMIN
 *  - Listagem: qualquer perfil autenticado pode listar
 *  - Decisões: VALIDAR, DEVOLVER, ESCALAR
 */
describe('Validações — E2E', () => {
  let app:   INestApplication;
  let ds:    DataSource;
  let seeds: SeedResult;

  let tokenProfessor:   string;
  let tokenCoordenador: string;
  let tokenDiretor:     string;
  let tokenAdmin:       string;

  const baseOcorrenciaDto = (alunoId: string, categoriaId: string, severidade = 2) => ({
    alunoId, categoriaId, severidade,
    dataIncidente: '2026-04-15',
    local:         'Sala 101 — Bloco A',
    descricao:     'Ocorrência criada para suite de validações — detalhe do incidente.',
  });

  const validarDto = (overrides: Record<string, unknown> = {}) => ({
    tipoDecisao:   'VALIDAR',
    justificativa: 'Justificativa com mais de trinta caracteres para ser considerada válida.',
    ...overrides,
  });

  /** Cria uma ocorrência com sev≥4 (status AGUARDANDO_VALIDACAO) */
  async function criarOcorrenciaParaValidar(
    token: string,
    severidade = 4,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ocorrencias')
      .set('Authorization', `Bearer ${token}`)
      .send(baseOcorrenciaDto(seeds.alunoMenor.id, seeds.categoria.id, severidade))
      .expect(201);
    return res.body.id;
  }

  beforeAll(async () => {
    app   = await createTestApp();
    ds    = app.get(DataSource);
    seeds = await seedTestData(ds);

    tokenProfessor   = gerarToken(app, { sub: seeds.professor.id,   email: seeds.professor.email,   perfil: PerfilUsuario.PROFESSOR,   campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenCoordenador = gerarToken(app, { sub: seeds.coordenador.id, email: seeds.coordenador.email, perfil: PerfilUsuario.COORDENADOR, campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenDiretor     = gerarToken(app, { sub: seeds.diretor.id,     email: seeds.diretor.email,     perfil: PerfilUsuario.DIRETOR,     campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
    tokenAdmin       = gerarToken(app, { sub: seeds.admin.id,       email: seeds.admin.email,       perfil: PerfilUsuario.ADMIN,       campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
  });

  afterAll(async () => { await app.close(); });

  // ─── POST /ocorrencias/:id/validacoes ────────────────────────────────────────

  describe('POST /api/v1/ocorrencias/:id/validacoes', () => {

    it('201 — coordenador valida ocorrência de outro registrador (fluxo feliz)', async () => {
      // Ocorrência criada pelo professor → coordenador valida
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto())
        .expect(201);

      expect(res.body).toHaveProperty('tipoDecisao', 'VALIDAR');
      expect(res.body).toHaveProperty('validadorId', seeds.coordenador.id);
    });

    it('201 — coordenador DEVOLVE ocorrência para revisão', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto({ tipoDecisao: 'DEVOLVER' }))
        .expect(201);

      expect(res.body.tipoDecisao).toBe('DEVOLVER');
    });

    it('201 — diretor ESCALA ocorrência', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenCoordenador);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenDiretor}`)
        .send(validarDto({ tipoDecisao: 'ESCALAR' }))
        .expect(201);

      expect(res.body.tipoDecisao).toBe('ESCALAR');
    });

    it('401 sem token', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor);
      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .send(validarDto())
        .expect(401);
    });

    it('403 — perfil PROFESSOR não possui autorização para validar (guard)', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenCoordenador);
      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(validarDto())
        .expect(403);
    });

    it('400 — justificativa muito curta (< 30 chars)', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor);
      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto({ justificativa: 'Curta demais.' }))
        .expect(400);
    });

    it('RN-08 — coordenador NÃO pode validar ocorrência que ele mesmo registrou → 403', async () => {
      // Coordenador registra uma ocorrência sev≥4
      const ocId = await criarOcorrenciaParaValidar(tokenCoordenador);

      // O mesmo coordenador tenta validar a própria ocorrência
      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto())
        .expect(403);
    });

    it('403 — coordenador NÃO pode validar ocorrência de severidade 5 (Gravíssima)', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor, 5);

      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto())
        .expect(403);
    });

    it('201 — diretor PODE validar ocorrência de severidade 5 (Gravíssima)', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor, 5);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenDiretor}`)
        .send(validarDto())
        .expect(201);

      expect(res.body.tipoDecisao).toBe('VALIDAR');
    });

    it('201 — admin PODE validar ocorrência de severidade 5 (Gravíssima)', async () => {
      const ocId = await criarOcorrenciaParaValidar(tokenProfessor, 5);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocId}/validacoes`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(validarDto())
        .expect(201);

      expect(res.body.tipoDecisao).toBe('VALIDAR');
    });

    it('403 — ocorrência não está em AGUARDANDO_VALIDACAO', async () => {
      // Criar com sev < 4 → status ABERTA (não aguarda validação)
      const dto = {
        ...baseOcorrenciaDto(seeds.alunoMaior.id, seeds.categoria.id, 2),
      };
      const criado = await request(app.getHttpServer())
        .post('/api/v1/ocorrencias').set('Authorization', `Bearer ${tokenCoordenador}`).send(dto).expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${criado.body.id}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto())
        .expect(403);
    });
  });

  // ─── GET /ocorrencias/:id/validacoes ─────────────────────────────────────────

  describe('GET /api/v1/ocorrencias/:id/validacoes', () => {
    let ocorrenciaId: string;

    beforeAll(async () => {
      ocorrenciaId = await criarOcorrenciaParaValidar(tokenProfessor);
      // Executar uma validação para ter dados na listagem
      await request(app.getHttpServer())
        .post(`/api/v1/ocorrencias/${ocorrenciaId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(validarDto())
        .expect(201);
    });

    it('200 — lista validações de uma ocorrência', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}/validacoes`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('tipoDecisao');
    });

    it('200 — professor também pode listar validações (sem restrição de perfil na listagem)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}/validacoes`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(200);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ocorrencias/${ocorrenciaId}/validacoes`)
        .expect(401);
    });
  });
});
