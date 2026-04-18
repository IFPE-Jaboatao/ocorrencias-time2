import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Injeta o usuário autenticado do JWT na rota */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
