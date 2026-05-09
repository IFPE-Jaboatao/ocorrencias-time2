import 'reflect-metadata';
import { NestFactory }                   from '@nestjs/core';
import { ValidationPipe }        from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet                             from 'helmet';
import cookieParser                        from 'cookie-parser';
import { AppModule }                     from './app.module';
import { HttpExceptionFilter }           from './common/filters/http-exception.filter';
import { validationExceptionFactory }   from './common/utils/validation-messages.util';
import { CsrfMiddleware }                from './common/middleware/csrf.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin:      process.env.FRONTEND_URL ?? 'http://localhost:3000',
    methods:     ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
      exceptionFactory:     validationExceptionFactory,
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

  // CSRF middleware — valida X-CSRF-Token em todas as mutações
  app.use(new CsrfMiddleware().use.bind(new CsrfMiddleware()));


  await app.listen('0.0.0.0', process.env.PORT ?? 3001);
}

bootstrap();
