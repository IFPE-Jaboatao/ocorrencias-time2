import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it('/ (GET) deve retornar 404 porque a API publica vive em /api/v1', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
