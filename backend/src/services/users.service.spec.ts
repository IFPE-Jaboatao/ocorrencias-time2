import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { NotificationsService } from './notifications.service';
import { Role } from '../common/decorators/roles.decorator';
import { CreateUserDto } from '../dto/users/create-user.dto';

function createUserMock(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-uuid-1';
  user.tenantId = 'tenant-1';
  user.email = 'admin@escola.edu.br';
  user.name = 'Administrador';
  user.roles = [Role.ADMIN];
  user.isActive = true;
  user.deletedAt = null;
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return Object.assign(user, overrides);
}

const TENANT_ID = 'tenant-1';
const ADMIN_USER_ID = 'admin-uuid';

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn((d) => Object.assign(new User(), d)),
  save: jest.fn(async (u) => u),
  softDelete: jest.fn().mockResolvedValue({}),
  createQueryBuilder: jest.fn(() => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getCount: jest.fn().mockResolvedValue(2),
  })),
});

const mockNotifications = () => ({ sendMagicLink: jest.fn() });

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useFactory: mockRepo },
        { provide: NotificationsService, useFactory: mockNotifications },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(getRepositoryToken(User));
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────
  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'novo@escola.edu.br',
      name: 'Novo Professor',
      roles: [Role.TEACHER],
    };

    it('cria usuário com e-mail normalizado (lowercase)', async () => {
      repo.findOne.mockResolvedValue(null);
      const user = await service.create({ ...dto, email: 'NOVO@Escola.edu.br' }, TENANT_ID);
      expect(user.email).toBe('novo@escola.edu.br');
    });

    it('lança ConflictException se e-mail já existe no tenant', async () => {
      repo.findOne.mockResolvedValue(createUserMock());
      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(ConflictException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────
  describe('findOne', () => {
    it('retorna usuário quando encontrado', async () => {
      const user = createUserMock();
      repo.findOne.mockResolvedValue(user);
      const result = await service.findOne('user-uuid-1', TENANT_ID);
      expect(result.id).toBe('user-uuid-1');
    });

    it('lança NotFoundException quando não encontrado', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────
  describe('remove', () => {
    it('lança BadRequestException ao tentar remover a própria conta', async () => {
      repo.findOne.mockResolvedValue(createUserMock({ id: ADMIN_USER_ID }));
      await expect(service.remove(ADMIN_USER_ID, TENANT_ID, ADMIN_USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('lança BadRequestException ao remover o último admin', async () => {
      const adminUser = createUserMock({ id: 'outro-admin', roles: [Role.ADMIN] });
      repo.findOne.mockResolvedValue(adminUser);
      // queryBuilder.getCount retorna 1 (último admin)
      repo.createQueryBuilder.mockReturnValue({
        where:          jest.fn().mockReturnThis(),
        andWhere:       jest.fn().mockReturnThis(),
        orderBy:        jest.fn().mockReturnThis(),
        skip:           jest.fn().mockReturnThis(),
        take:           jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
        getCount:       jest.fn().mockResolvedValue(1),
      });
      await expect(service.remove('outro-admin', TENANT_ID, ADMIN_USER_ID))
        .rejects.toThrow(BadRequestException);
    });

    it('realiza soft delete com sucesso', async () => {
      const teacher = createUserMock({ id: 'teacher-1', roles: [Role.TEACHER] });
      repo.findOne.mockResolvedValue(teacher);
      await service.remove('teacher-1', TENANT_ID, ADMIN_USER_ID);
      expect(repo.softDelete).toHaveBeenCalledWith('teacher-1');
    });
  });
});
