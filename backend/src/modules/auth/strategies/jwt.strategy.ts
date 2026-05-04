import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy }                   from '@nestjs/passport';
import { ExtractJwt, Strategy }               from 'passport-jwt';
import { ConfigService }                      from '@nestjs/config';
import { AuthenticatedUser }                  from '../../../common/interfaces/authenticated-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: AuthenticatedUser): AuthenticatedUser {
    if (!payload?.sub) throw new UnauthorizedException();
    return payload;
  }
}
