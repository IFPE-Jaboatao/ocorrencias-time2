import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validação global de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS — ajustar em produção
  app.enableCors({ origin: process.env.FRONTEND_URL ?? 'http://localhost:5173' });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('RadarAcadêmico API')
    .setDescription('API de gestão de ocorrências acadêmicas')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`RadarAcadêmico rodando em http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger em http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
