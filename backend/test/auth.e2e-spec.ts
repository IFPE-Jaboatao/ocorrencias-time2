import { INestApplication }    from '@nestjs/common';
import request                 from 'supertest';
import { DataSource }          from 'typeorm';
import { createTestApp, gerarToken } from './helpers/create-test-app';
import { seedTestData, SeedResult } from './helpers/seed';
import { PerfilUsuario }       from '../src/common/enums/perfil-usuario.enum';

describe('Auth — E2E', () => {
  let app:    INestApplication;
  let ds:     DataSource;
  let seeds:  SeedResult;

  beforeAll(async () => {
    app    = await createTestApp();
    ds     = app.get(DataSource);
    seeds  = await seedTestData(ds);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── magic-link ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/magic-link', () => {
    it('retorna token quando usuário existe (ambiente não-produção)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.professor.email })
        .expect(200);

      expect(res.body).toHaveProperty('token');
      expect(typeof res.body.token).toBe('string');
    });

    it('400 quando e-mail inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: 'nao-e-email' })
        .expect(400);
    });

    it('retorna 404 quando usuário não existe', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: 'naoexiste@escola.edu.br' })
        .expect(404);
    });
  });

  // ─── magic-link verificar ────────────────────────────────────────────────────

  describe('POST /api/v1/auth/magic-link/verificar', () => {
    it('emite accessToken + refreshToken com token válido', async () => {
      // Solicitar token
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.coordenador.email })
        .expect(200);

      const rawToken = solRes.body.token as string;

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: rawToken })
        .expect(200);

      expect(verRes.body).toHaveProperty('accessToken');
      expect(verRes.body).toHaveProperty('refreshToken');
    });

    it('400 quando token já foi utilizado (single-use — H-07)', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.diretor.email })
        .expect(200);

      const rawToken = solRes.body.token as string;

      // Primeiro uso — sucesso
      await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: rawToken })
        .expect(200);

      // Segundo uso — deve falhar
      await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: rawToken })
        .expect(400);
    });

    it('401 quando token inválido', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: 'token-invalido-qualquer' })
        .expect(401);
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('emite novo par de tokens com refresh válido', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.admin.email })
        .expect(200);

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: solRes.body.token })
        .expect(200);

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: verRes.body.refreshToken })
        .expect(200);

      expect(refreshRes.body).toHaveProperty('accessToken');
      expect(refreshRes.body).toHaveProperty('refreshToken');
      // O refreshToken antigo não pode ser reutilizado (rotação)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: verRes.body.refreshToken })
        .expect(401);
    });
  });

  // ─── dev-login ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/dev-login', () => {
    it('retorna tokens com e-mail válido (DEV_LOGIN_ENABLED=true)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ email: seeds.professor.email })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('404 para e-mail inexistente', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ email: 'naoexiste@escola.edu.br' })
        .expect(404);
    });
  });

  // ─── rota protegida exige token ──────────────────────────────────────────────

  describe('Proteção JWT global', () => {
    it('401 ao acessar rota protegida sem token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .expect(401);
    });

    it('200 ao acessar rota protegida com token válido', async () => {
      const token = gerarToken(app, {
        sub: seeds.professor.id,
        email: seeds.professor.email,
        perfil: PerfilUsuario.PROFESSOR,
        campus: seeds.professor.campus,
      });

      await request(app.getHttpServer())
        .get('/api/v1/ocorrencias')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('revoga refresh token e retorna 204', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.coordenadorB.email })
        .expect(200);

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: solRes.body.token })
        .expect(200);

      const token = gerarToken(app, {
        sub: seeds.coordenadorB.id,
        email: seeds.coordenadorB.email,
        perfil: PerfilUsuario.COORDENADOR,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken: verRes.body.refreshToken })
        .expect(204);

      // Após logout, refresh token não pode ser reutilizado
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: verRes.body.refreshToken })
        .expect(401);
    });
  });
});
