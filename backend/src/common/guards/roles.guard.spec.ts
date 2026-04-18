import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role, ROLES_KEY } from '../decorators/roles.decorator';

function makeContext(userRoles: Role[], requiredRoles: Role[]): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles: userRoles } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  it('permite acesso quando nenhum papel é exigido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(null);
    expect(guard.canActivate(makeContext([], []))).toBe(true);
  });

  it('permite acesso quando usuário tem o papel exigido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.TEACHER]);
    expect(guard.canActivate(makeContext([Role.TEACHER], [Role.TEACHER]))).toBe(true);
  });

  it('permite acesso para perfil híbrido (múltiplos papéis)', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.COORDINATOR]);
    expect(
      guard.canActivate(makeContext([Role.TEACHER, Role.COORDINATOR], [Role.COORDINATOR])),
    ).toBe(true);
  });

  it('nega acesso quando usuário NÃO tem o papel exigido', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.ADMIN]);
    expect(guard.canActivate(makeContext([Role.TEACHER], [Role.ADMIN]))).toBe(false);
  });

  it('nega acesso quando user está undefined no request', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue([Role.ADMIN]);
    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
