import { SetMetadata } from '@nestjs/common';

export enum Role {
  STUDENT_ADULT  = 'ROLE_STUDENT_ADULT',
  STUDENT_MINOR  = 'ROLE_STUDENT_MINOR',
  GUARDIAN       = 'ROLE_GUARDIAN',
  TEACHER        = 'ROLE_TEACHER',
  COORDINATOR    = 'ROLE_COORDINATOR',
  SECRETARY      = 'ROLE_SECRETARY',
  DIRECTOR       = 'ROLE_DIRECTOR',
  COUNSELOR      = 'ROLE_COUNSELOR',
  ADMIN          = 'ROLE_ADMIN',
}

export const ROLES_KEY = 'roles';
/** Define quais papéis têm acesso à rota */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
