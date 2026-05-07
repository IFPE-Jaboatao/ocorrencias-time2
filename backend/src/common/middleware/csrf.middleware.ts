import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const CSRF_EXEMPT_PATHS = [
  '/api/v1/auth/magic-link',
  '/api/v1/auth/magic-link/verificar',
  '/api/v1/auth/dev-login',
  '/api/v1/auth/csrf-token',
  '/api/v1/auth/refresh',
];

const MUTATING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (!MUTATING_METHODS.includes(req.method)) {
      return next();
    }

    // Rotas públicas de auth dispensam CSRF
    if (CSRF_EXEMPT_PATHS.some(p => req.path === p || req.path.startsWith(p))) {
      return next();
    }

    const cookieToken  = req.cookies?.csrf_token as string | undefined;
    const headerToken  = req.headers['x-csrf-token'] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token inválido ou ausente');
    }

    next();
  }
}
