import { INestApplication }    from '@nestjs/common';
import request                 from 'supertest';
import { DataSource }          from 'typeorm';
import { createTestApp, gerarToken } from './helpers/create-test-app';
import { seedTestData, SeedResult } from './helpers/seed';
import { PerfilUsuario }       from '../src/common/enums/perfil-usuario.enum';

/** Extrai o valor de um cookie pelo nome do array Set-Cookie */
function extractCookie(setCookieHeader: unknown, name: string): string | null {
  if (!setCookieHeader) return null;
  const cookies = Array.isArray(setCookieHeader) ? (setCookieHeader as string[]) : [String(setCookieHeader)];
  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`^${name}=([^;]+)`));
    if (match) return match[1];
  }
  return null;
}

/** Monta header Cookie a partir de pares [nome, valor] */
function buildCookieHeader(...pairs: [string, string][]): string {
  return pairs.map(([k, v]) => `${k}=${v}`).join('; ');
}

/** Lê o Set-Cookie como array de forma segura */
function getSetCookies(headers: Record<string, unknown>): string[] {
  const raw = headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? (raw as string[]) : [String(raw)];
}

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
    it('seta cookies sgoa_token e sgoa_refresh e retorna { ok: true }', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.coordenador.email })
        .expect(200);

      const rawToken = solRes.body.token as string;

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: rawToken })
        .expect(200);

      expect(verRes.body).toEqual({ ok: true });
      const setCookies = getSetCookies(verRes.headers as Record<string, unknown>);
      expect(setCookies.some(c => c.startsWith('sgoa_token='))).toBe(true);
      expect(setCookies.some(c => c.startsWith('sgoa_refresh='))).toBe(true);
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
    it('seta novo cookie sgoa_token com refresh válido (e rotaciona token)', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.admin.email })
        .expect(200);

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: solRes.body.token })
        .expect(200);

      const setCookies = getSetCookies(verRes.headers as Record<string, unknown>);
      const refreshToken = extractCookie(setCookies, 'sgoa_refresh');
      expect(refreshToken).toBeTruthy();

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', buildCookieHeader(['sgoa_refresh', refreshToken!]))
        .expect(200);

      expect(refreshRes.body).toEqual({ ok: true });
      const newCookies = getSetCookies(refreshRes.headers as Record<string, unknown>);
      expect(newCookies.some(c => c.startsWith('sgoa_token='))).toBe(true);

      // O refreshToken antigo não pode ser reutilizado (rotação)
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', buildCookieHeader(['sgoa_refresh', refreshToken!]))
        .expect(401);
    });
  });

  // ─── dev-login ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/dev-login', () => {
    it('seta cookie sgoa_token e retorna { ok: true } (DEV_LOGIN_ENABLED=true)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/dev-login')
        .send({ email: seeds.professor.email })
        .expect(200);

      expect(res.body).toEqual({ ok: true });
      const setCookies = getSetCookies(res.headers as Record<string, unknown>);
      expect(setCookies.some(c => c.startsWith('sgoa_token='))).toBe(true);
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
    it('revoga refresh token (via cookie) e retorna 204', async () => {
      const solRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link')
        .send({ email: seeds.coordenadorB.email })
        .expect(200);

      const verRes = await request(app.getHttpServer())
        .post('/api/v1/auth/magic-link/verificar')
        .send({ token: solRes.body.token })
        .expect(200);

      const setCookies = getSetCookies(verRes.headers as Record<string, unknown>);
      const refreshToken = extractCookie(setCookies, 'sgoa_refresh');
      expect(refreshToken).toBeTruthy();

      const token = gerarToken(app, {
        sub: seeds.coordenadorB.id,
        email: seeds.coordenadorB.email,
        perfil: PerfilUsuario.COORDENADOR,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .set('Cookie', buildCookieHeader(['sgoa_refresh', refreshToken!]))
        .expect(204);

      // Após logout, refresh token não pode ser reutilizado
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', buildCookieHeader(['sgoa_refresh', refreshToken!]))
        .expect(401);
    });
  });
});
