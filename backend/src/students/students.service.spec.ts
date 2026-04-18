import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { StudentsService } from './students.service';
import { Student, EducationLevel } from './entities/student.entity';
import { Guardian, GuardianRelationship } from '../guardians/entities/guardian.entity';
import { GuardianStudent } from './entities/guardian-student.entity';
import { CreateStudentDto } from './dto/create-student.dto';

const TENANT_ID = 'tenant-1';

function createStudentMock(overrides: Partial<Student> = {}): Student {
  const s = new Student();
  s.id                 = 'student-uuid-1';
  s.tenantId           = TENANT_ID;
  s.name               = 'Pedro Oliveira';
  s.registrationNumber = '2024001';
  s.birthDate          = new Date('2010-05-20');
  s.isMinor            = true;
  s.educationLevel     = EducationLevel.FUNDAMENTAL_FINAL;
  s.className          = '8A';
  s.campus             = null;
  s.userId             = null;
  s.guardianStudents   = [];
  s.deletedAt          = null;
  s.createdAt          = new Date();
  s.updatedAt          = new Date();
  return Object.assign(s, overrides);
}

function createGuardianMock(overrides: Partial<Guardian> = {}): Guardian {
  const g = new Guardian();
  g.id           = 'guardian-uuid-1';
  g.name         = 'Maria Oliveira';
  g.email        = 'maria@email.com';
  g.phone        = null;
  g.relationship = GuardianRelationship.MAE;
  g.userId       = null;
  g.createdAt    = new Date();
  g.updatedAt    = new Date();
  return Object.assign(g, overrides);
}

const mockStudentsRepo = () => ({
  findOne:     jest.fn(),
  findAndCount: jest.fn(),
  softDelete:  jest.fn().mockResolvedValue({}),
});

const mockGuardiansRepo = () => ({
  findOne: jest.fn(),
});

const mockGsRepo = () => ({
  findOne: jest.fn(),
  save:    jest.fn(),
  find:    jest.fn(),
});

const mockManager = {
  create:  jest.fn((Entity: any, data: any) => Object.assign(new Entity(), data)),
  save:    jest.fn(),
  findOne: jest.fn(),
};

const mockDataSource = () => ({
  transaction: jest.fn(async (cb: (m: typeof mockManager) => Promise<any>) => cb(mockManager)),
});

describe('StudentsService', () => {
  let service: StudentsService;
  let studentsRepo: ReturnType<typeof mockStudentsRepo>;
  let dataSource: ReturnType<typeof mockDataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentsService,
        { provide: getRepositoryToken(Student),         useFactory: mockStudentsRepo },
        { provide: getRepositoryToken(Guardian),        useFactory: mockGuardiansRepo },
        { provide: getRepositoryToken(GuardianStudent), useFactory: mockGsRepo },
        { provide: DataSource,                          useFactory: mockDataSource },
      ],
    }).compile();

    service      = module.get<StudentsService>(StudentsService);
    studentsRepo = module.get(getRepositoryToken(Student));
    dataSource   = module.get(DataSource);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dtoMaior: CreateStudentDto = {
      name:               'João Adulto',
      registrationNumber: '2024002',
      birthDate:          '2000-01-01',
      educationLevel:     EducationLevel.SUPERIOR,
    };

    const dtoMenor: CreateStudentDto = {
      name:               'Pedro Menor',
      registrationNumber: '2024001',
      birthDate:          '2015-06-10',
      educationLevel:     EducationLevel.FUNDAMENTAL_FINAL,
      guardian: {
        name:         'Maria Responsável',
        email:        'maria@email.com',
        relationship: GuardianRelationship.MAE,
      },
    };

    it('cria aluno maior de 18 sem responsável', async () => {
      studentsRepo.findOne.mockResolvedValue(null);
      const savedStudent = createStudentMock({ isMinor: false });
      mockManager.save
        .mockResolvedValueOnce(savedStudent)  // save student inside transaction
        .mockResolvedValue(savedStudent);     // findOne after
      studentsRepo.findOne.mockResolvedValueOnce(null).mockResolvedValue(savedStudent);

      const result = await service.create(dtoMaior, TENANT_ID);
      expect(result.isMinor).toBe(false);
    });

    it('lança BadRequestException ao criar menor sem responsável', async () => {
      const dto: CreateStudentDto = {
        name:               'Menor Sem Resp',
        registrationNumber: '2024003',
        birthDate:          '2015-01-01',
        educationLevel:     EducationLevel.FUNDAMENTAL_INICIAL,
        // sem guardian
      };
      studentsRepo.findOne.mockResolvedValue(null);
      await expect(service.create(dto, TENANT_ID)).rejects.toThrow(BadRequestException);
    });

    it('lança ConflictException se matrícula já existe no tenant', async () => {
      studentsRepo.findOne.mockResolvedValue(createStudentMock());
      await expect(service.create(dtoMenor, TENANT_ID)).rejects.toThrow(ConflictException);
    });

    it('cria menor com responsável novo — vincula via guardian_students', async () => {
      studentsRepo.findOne.mockResolvedValueOnce(null); // sem duplicata
      const savedStudent  = createStudentMock({ isMinor: true });
      const savedGuardian = createGuardianMock();

      mockManager.save
        .mockResolvedValueOnce(savedStudent)   // save Student
        .mockResolvedValueOnce(savedGuardian)  // save Guardian
        .mockResolvedValueOnce({});            // save GuardianStudent
      mockManager.findOne.mockResolvedValueOnce(null); // guardian não existe

      // findOne após a transação
      studentsRepo.findOne.mockResolvedValue(savedStudent);

      const result = await service.create(dtoMenor, TENANT_ID);
      expect(result.id).toBe('student-uuid-1');
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('reusa responsável existente pelo e-mail — não cria duplicata', async () => {
      studentsRepo.findOne.mockResolvedValueOnce(null);
      const savedStudent  = createStudentMock({ isMinor: true });
      const existingGuardian = createGuardianMock();

      mockManager.findOne.mockResolvedValueOnce(existingGuardian); // já existe
      mockManager.save
        .mockResolvedValueOnce(savedStudent)  // save Student
        .mockResolvedValueOnce({});           // save GuardianStudent (sem criar guardian)
      studentsRepo.findOne.mockResolvedValue(savedStudent);

      await service.create(dtoMenor, TENANT_ID);
      // save chamado 2 vezes: student + link (NÃO cria guardian novo)
      expect(mockManager.save).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna aluno quando encontrado', async () => {
      const student = createStudentMock();
      studentsRepo.findOne.mockResolvedValue(student);
      const result = await service.findOne('student-uuid-1', TENANT_ID);
      expect(result.id).toBe('student-uuid-1');
    });

    it('lança NotFoundException quando aluno não existe', async () => {
      studentsRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza campos sem conflito de matrícula', async () => {
      const student = createStudentMock();
      studentsRepo.findOne.mockResolvedValue(student);
      const result = await service.update('student-uuid-1', { name: 'Pedro Novo' }, TENANT_ID);
      expect(result.name).toBe('Pedro Novo');
    });

    it('lança ConflictException ao alterar matrícula já usada por outro aluno', async () => {
      const student  = createStudentMock();
      const conflict = createStudentMock({ id: 'outro-id', registrationNumber: '2024999' });
      studentsRepo.findOne
        .mockResolvedValueOnce(student)   // findOne no update
        .mockResolvedValueOnce(conflict); // verificação de duplicata
      await expect(
        service.update('student-uuid-1', { registrationNumber: '2024999' }, TENANT_ID),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('realiza soft delete com sucesso', async () => {
      studentsRepo.findOne.mockResolvedValue(createStudentMock());
      await service.remove('student-uuid-1', TENANT_ID);
      expect(studentsRepo.softDelete).toHaveBeenCalledWith('student-uuid-1');
    });

    it('lança NotFoundException ao remover aluno inexistente', async () => {
      studentsRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('inexistente', TENANT_ID)).rejects.toThrow(NotFoundException);
    });
  });
});
