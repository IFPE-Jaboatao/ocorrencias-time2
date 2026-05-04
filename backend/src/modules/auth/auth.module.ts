import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { JwtModule }       from '@nestjs/jwt';
import { PassportModule }  from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController }  from './auth.controller';
import { AuthService }     from './auth.service';
import { JwtStrategy }     from './strategies/jwt.strategy';
import { JwtAuthGuard }    from './guards/jwt-auth.guard';
import { MagicLinkToken }  from './entities/magic-link-token.entity';
import { RefreshToken }    from './entities/refresh-token.entity';
import { Usuario }         from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MagicLinkToken, RefreshToken, Usuario]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers:   [AuthService, JwtStrategy, JwtAuthGuard],
  exports:     [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
