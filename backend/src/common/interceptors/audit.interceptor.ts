import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditoriaService } from '../../modules/auditoria/auditoria.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

const AUDIT_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req    = context.switchToHttp().getRequest();
    const method = req.method as string;

    if (!AUDIT_METHODS.has(method)) return next.handle();

    const user: AuthenticatedUser | undefined = req.user;
    if (!user) return next.handle();

    const path: string     = req.path ?? '';
    const entidade         = path.split('/').filter(Boolean)[2] ?? 'desconhecido';
    const entidadeId: string = req.params?.id ?? 'novo';
    const ip: string       = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '0.0.0.0';

    return next.handle().pipe(
      tap(() => {
        this.auditoriaService.registrar({
          atorId:     user.sub,
          perfilAtor: user.perfil,
          acao:       method,
          entidade,
          entidadeId,
          ip,
        });
      }),
    );
  }
}
