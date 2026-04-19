import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { GuardiansService } from './guardians.service';
import { Guardian, GuardianRelationship } from '../entities/guardian.entity';
import { GuardianStudent } from '../entities/guardian-student.entity';
import { CreateGuardianDto } from '../dto/guardians/create-guardian.dto';

function createGuardianMock(overrides: Partial<Guardian> = {}): Guardian {
  const g = new Guardian();
  g.id           = 'guardian-uuid-1';
  g.name         = 'Maria Oliveira';
  g.email        = 'maria@email.com';
  g.phone        = '(11) 99999-0000';
  g.relationship = GuardianRelationship.MAE;
  g.userId       = null;
  g.createdAt    = new Date();
  g.updatedAt    = new Date();
  return Object.assign(g, overrides);
}

const mockGuardiansRepo = () => ({
  create:       jest.fn((d) => Object.assign(new Guardian(), d)),
  save:         jest.fn(async (g) => g),
  findOne:      jest.fn(),
  findAndCount: jest.fn(),
});

const mockGsRepo = () => ({
  find:    jest.fn(),
  findOne: jest.fn(),
  save:    jest.fn(async (gs) => gs),
});

describe('GuardiansService', () => {
  let service: GuardiansService;
  let guardiansRepo: ReturnType<typeof mockGuardiansRepo>;
  let gsRepo: ReturnType<typeof mockGsRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GuardiansService,
        { provide: getRepositoryToken(Guardian),        useFactory: mockGuardiansRepo },
        { provide: getRepositoryToken(GuardianStudent), useFactory: mockGsRepo },
      ],
    }).compile();

    service       = module.get<GuardiansService>(GuardiansService);
    guardiansRepo = module.get(getRepositoryToken(Guardian));
    gsRepo        = module.get(getRepositoryToken(GuardianStudent));
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto: CreateGuardianDto = {
      name:         'Maria Oliveira',
      email:        'MARIA@Email.com',
      relationship: GuardianRelationship.MAE,
    };

    it('cria responsável com e-mail normalizado (lowercase)', async () => {
      const result = await service.create(dto);
      expect(result.email).toBe('maria@email.com');
      expect(guardiansRepo.save).toHaveBeenCalled();
    });

    it('armazena phone como null quando não informado', async () => {
      const result = await service.create(dto);
      expect(result.phone).toBeNull();
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna responsável quando encontrado', async () => {
      guardiansRepo.findOne.mockResolvedValue(createGuardianMock());
      const result = await service.findOne('guardian-uuid-1');
      expect(result.id).toBe('guardian-uuid-1');
    });

    it('lança NotFoundException quando responsável não existe', async () => {
      guardiansRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findActiveByStudentId ────────────────────────────────────────────────────

  describe('findActiveByStudentId', () => {
    it('retorna somente responsáveis com link ativo (H-03)', async () => {
      const guardian = createGuardianMock();
      gsRepo.find.mockResolvedValue([{ guardian, isActive: true }]);
      const result = await service.findActiveByStudentId('student-uuid-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('guardian-uuid-1');
    });

    it('retorna lista vazia quando não há vínculos ativos', async () => {
      gsRepo.find.mockResolvedValue([]);
      const result = await service.findActiveByStudentId('student-uuid-1');
      expect(result).toHaveLength(0);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('normaliza e-mail ao atualizar', async () => {
      guardiansRepo.findOne.mockResolvedValue(createGuardianMock());
      const result = await service.update('guardian-uuid-1', { email: 'NOVO@Email.com' });
      expect(result.email).toBe('novo@email.com');
    });

    it('lança NotFoundException ao atualizar responsável inexistente', async () => {
      guardiansRepo.findOne.mockResolvedValue(null);
      await expect(service.update('inexistente', { name: 'Novo' })).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deactivateLink ───────────────────────────────────────────────────────────

  describe('deactivateLink', () => {
    it('desativa vínculo existente (isActive = false)', async () => {
      const link = { guardianId: 'g1', studentId: 's1', isActive: true };
      gsRepo.findOne.mockResolvedValue(link);
      await service.deactivateLink('g1', 's1');
      expect(gsRepo.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('lança NotFoundException para vínculo inexistente', async () => {
      gsRepo.findOne.mockResolvedValue(null);
      await expect(service.deactivateLink('g1', 's1')).rejects.toThrow(NotFoundException);
    });
  });
});
