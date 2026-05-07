import 'reflect-metadata';
import { NestFactory }                   from '@nestjs/core';
import { ValidationPipe }                from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet                             from 'helmet';
import { AppModule }                     from './app.module';
import { HttpExceptionFilter }           from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  app.use(helmet());

  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods:     ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger ANTES do setGlobalPrefix — evita que o prefixo 'api/v1' seja
  // herdado pela rota /api/docs, resultando em /api/v1/api/docs (404)
  // Ativado quando NODE_ENV != production OU SWAGGER_ENABLED=true
  const swaggerAtivo =
    process.env.NODE_ENV !== 'production' ||
    process.env.SWAGGER_ENABLED === 'true';

  if (swaggerAtivo) {
    const config = new DocumentBuilder()
      .setTitle('Radar Acadêmico — Gestão de Ocorrências')
      .setDescription('API REST para gestão do ciclo de vida de ocorrências acadêmicas')
      .setVersion('1.0')
      .addServer('/api/v1', 'API v1')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'jwt')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT ?? 3001);
}

bootstrap();
