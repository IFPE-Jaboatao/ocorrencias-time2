import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const databaseConfig = (config: ConfigService): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: config.getOrThrow('DB_HOST'),
  port: config.get<number>('DB_PORT', 3306),
  username: config.getOrThrow('DB_USER'),
  password: config.getOrThrow('DB_PASS'),
  database: config.getOrThrow('DB_NAME'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: true,   // executa migrations pendentes automaticamente ao iniciar
  logging: config.get('NODE_ENV') === 'development',
  charset: 'utf8mb4',
});
