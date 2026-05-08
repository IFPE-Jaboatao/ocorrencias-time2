import { INestApplication } from '@nestjs/common';
import request              from 'supertest';
import { DataSource }       from 'typeorm';
import { createTestApp, gerarToken } from './helpers/create-test-app';
import { seedTestData, SeedResult } from './helpers/seed';
import { PerfilUsuario }    from '../src/common/enums/perfil-usuario.enum';
import { Segmento }         from '../src/common/enums/segmento.enum';

/**
 * Suite E2E — Alunos (RF-02, RF-14)
 *
 * Cobre:
 *  - Guard @Roles: POST e PATCH exigem ADMIN ou SECRETARIA
 *  - GET /alunos: qualquer perfil autenticado (campus-scoped)
 *  - H-08: coordenador de outro campus não vê alunos do Campus A
 *  - GET /alunos/buscar: autocomplete campus-scoped
 *  - PATCH /alunos/:id: somente ADMIN ou SECRETARIA
 */
describe('Alunos — E2E', () => {
  let app:   INestApplication;
  let ds:    DataSource;
  let seeds: SeedResult;

  let tokenProfessor:    string;
  let tokenCoordenador:  string;
  let tokenCoordenadorB: string;
  let tokenDiretor:      string;
  let tokenAdmin:        string;
  let tokenSecretaria:   string;

  // Prefixo único por execução — evita colisão com dados de runs anteriores
  const RUN = Date.now();
  const novoAlunoDto = (suffix: string) => ({
    matricula:       `TEST-${RUN}-${suffix}`,
    nome:            `Aluno Teste ${suffix}`,
    dataNascimento:  '2008-06-15',
    segmento:        Segmento.FUNDAMENTAL,
    campus:          'Campus A',
    curso:           'Ensino Fundamental',
    turma:           '5A',
  });

  beforeAll(async () => {
    app   = await createTestApp();
    ds    = app.get(DataSource);
    seeds = await seedTestData(ds);

    tokenProfessor    = gerarToken(app, { sub: seeds.professor.id,    email: seeds.professor.email,    perfil: PerfilUsuario.PROFESSOR,    campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenCoordenador  = gerarToken(app, { sub: seeds.coordenador.id,  email: seeds.coordenador.email,  perfil: PerfilUsuario.COORDENADOR,  campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
    tokenCoordenadorB = gerarToken(app, { sub: seeds.coordenadorB.id, email: seeds.coordenadorB.email, perfil: PerfilUsuario.COORDENADOR,  campus: 'Campus B', segmentos: [Segmento.FUNDAMENTAL] });
    tokenDiretor      = gerarToken(app, { sub: seeds.diretor.id,      email: seeds.diretor.email,      perfil: PerfilUsuario.DIRETOR,      campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
    tokenAdmin        = gerarToken(app, { sub: seeds.admin.id,        email: seeds.admin.email,        perfil: PerfilUsuario.ADMIN,        campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR] });
    tokenSecretaria   = gerarToken(app, { perfil: PerfilUsuario.SECRETARIA, campus: 'Campus A', segmentos: [Segmento.FUNDAMENTAL] });
  });

  afterAll(async () => { await app.close(); });

  // ─── POST /alunos ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/alunos', () => {
    it('201 — admin cria aluno com sucesso', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(novoAlunoDto('ADM001'))
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.matricula).toMatch(/^TEST-\d+-ADM001$/);
    });

    it('201 — secretaria cria aluno com sucesso', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenSecretaria}`)
        .send(novoAlunoDto('SEC001'))
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('403 — professor não pode criar aluno', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send(novoAlunoDto('PROF001'))
        .expect(403);
    });

    it('403 — coordenador não pode criar aluno', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send(novoAlunoDto('COORD001'))
        .expect(403);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .send(novoAlunoDto('NOAUTH'))
        .expect(401);
    });

    it('409 — matrícula duplicada retorna ConflictException', async () => {
      const dto = novoAlunoDto('DUP001');
      await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(dto)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send(dto)
        .expect(409);
    });
  });

  // ─── GET /alunos ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/alunos', () => {
    it('200 — coordenador do Campus A vê alunos do Campus A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      // Todos os alunos retornados devem ser do Campus A
      const fora = res.body.data.filter((a: any) => a.campus !== 'Campus A');
      expect(fora).toHaveLength(0);
    });

    it('H-08 — coordenador do Campus B NÃO vê alunos do Campus A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenCoordenadorB}`)
        .expect(200);

      // Nenhum aluno de Campus A deve aparecer para o coordenador B
      const alunosCampusA = res.body.data.filter((a: any) => a.campus === 'Campus A');
      expect(alunosCampusA).toHaveLength(0);
    });

    it('200 — diretor vê alunos de todos os campi', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenDiretor}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
    });

    it('200 — admin vê alunos de todos os campi', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('200 — professor autenticado pode listar alunos (escopo campus)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/alunos')
        .expect(401);
    });
  });

  // ─── GET /alunos/buscar ───────────────────────────────────────────────────────

  describe('GET /api/v1/alunos/buscar', () => {
    it('200 — busca retorna alunos do mesmo campus para coordenador', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos/buscar?q=Aluno')
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('200 — busca retorna lista vazia para campus B sem alunos', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/alunos/buscar?q=Aluno')
        .set('Authorization', `Bearer ${tokenCoordenadorB}`)
        .expect(200);

      // Campus B não tem alunos seeded
      expect(Array.isArray(res.body)).toBe(true);
      const campusA = res.body.filter((a: any) => a.campus === 'Campus A');
      expect(campusA).toHaveLength(0);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/alunos/buscar?q=Aluno')
        .expect(401);
    });
  });

  // ─── PATCH /alunos/:id ───────────────────────────────────────────────────────

  describe('PATCH /api/v1/alunos/:id', () => {
    it('200 — admin pode atualizar dados do aluno', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nome: 'Aluno Menor Atualizado E2E' })
        .expect(200);

      expect(res.body.nome).toBe('Aluno Menor Atualizado E2E');
    });

    it('200 — secretaria pode atualizar dados do aluno', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .set('Authorization', `Bearer ${tokenSecretaria}`)
        .send({ nome: 'Aluno Menor Secretaria E2E' })
        .expect(200);
    });

    it('403 — professor não pode atualizar dados do aluno', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .send({ nome: 'Tentativa Professor' })
        .expect(403);
    });

    it('403 — coordenador não pode atualizar dados do aluno', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .set('Authorization', `Bearer ${tokenCoordenador}`)
        .send({ nome: 'Tentativa Coordenador' })
        .expect(403);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .send({ nome: 'Sem Token' })
        .expect(401);
    });
  });

  // ─── GET /alunos/:id ──────────────────────────────────────────────────────────

  describe('GET /api/v1/alunos/:id', () => {
    it('200 — qualquer perfil autenticado pode buscar aluno por ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .set('Authorization', `Bearer ${tokenProfessor}`)
        .expect(200);

      expect(res.body.id).toBe(seeds.alunoMenor.id);
    });

    it('404 — ID inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/alunos/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(404);
    });

    it('401 sem token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/alunos/${seeds.alunoMenor.id}`)
        .expect(401);
    });
  });
});
