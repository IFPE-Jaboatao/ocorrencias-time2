import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { Guardian } from '../guardians/entities/guardian.entity';
import { GuardianStudent } from './entities/guardian-student.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    @InjectRepository(Student)
    private readonly studentsRepo: Repository<Student>,
    @InjectRepository(Guardian)
    private readonly guardiansRepo: Repository<Guardian>,
    @InjectRepository(GuardianStudent)
    private readonly gsRepo: Repository<GuardianStudent>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateStudentDto, tenantId: string): Promise<Student> {
    const birthDate = new Date(dto.birthDate);
    const isMinor   = this.computeIsMinor(birthDate);

    // RN-02 / H-03: responsável obrigatório para menor
    if (isMinor && !dto.guardian) {
      throw new BadRequestException(
        'Responsável legal é obrigatório para alunos menores de 18 anos.',
      );
    }

    const existing = await this.studentsRepo.findOne({
      where: { registrationNumber: dto.registrationNumber, tenantId },
    });
    if (existing) {
      throw new ConflictException('Matrícula já cadastrada nesta instituição.');
    }

    // Transação: student + guardian + link atômicos
    const student = await this.dataSource.transaction(async (manager) => {
      const newStudent = manager.create(Student, {
        tenantId,
        name:               dto.name,
        registrationNumber: dto.registrationNumber,
        birthDate,
        isMinor,
        educationLevel:     dto.educationLevel,
        className:          dto.className ?? null,
        campus:             dto.campus    ?? null,
        userId:             dto.userId    ?? null,
      });
      const savedStudent = await manager.save(Student, newStudent);

      if (isMinor && dto.guardian) {
        // Reusa responsável existente pelo e-mail (idempotente)
        let guardian = await manager.findOne(Guardian, {
          where: { email: dto.guardian.email.toLowerCase().trim() },
        });

        if (!guardian) {
          guardian = manager.create(Guardian, {
            name:         dto.guardian.name,
            email:        dto.guardian.email.toLowerCase().trim(),
            phone:        dto.guardian.phone   ?? null,
            relationship: dto.guardian.relationship,
            userId:       dto.guardian.userId  ?? null,
          });
          guardian = await manager.save(Guardian, guardian);
        }

        const link = manager.create(GuardianStudent, {
          guardianId: guardian.id,
          studentId:  savedStudent.id,
          isActive:   true,
        });
        await manager.save(GuardianStudent, link);
      }

      return savedStudent;
    });

    this.logger.log(
      `Aluno criado: ${student.name} [${student.registrationNumber}] isMinor=${isMinor}`,
    );
    return this.findOne(student.id, tenantId);
  }

  async findAll(
    tenantId: string,
    filters: { page?: number; limit?: number },
  ): Promise<{ data: Student[]; total: number }> {
    const page  = filters.page  ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const [data, total] = await this.studentsRepo.findAndCount({
      where:     { tenantId, deletedAt: IsNull() },
      relations: ['guardianStudents', 'guardianStudents.guardian'],
      order:     { name: 'ASC' },
      skip:      (page - 1) * limit,
      take:      limit,
    });
    return { data, total };
  }

  async findOne(id: string, tenantId: string): Promise<Student> {
    const student = await this.studentsRepo.findOne({
      where:     { id, tenantId, deletedAt: IsNull() },
      relations: ['guardianStudents', 'guardianStudents.guardian'],
    });
    if (!student) throw new NotFoundException('Aluno não encontrado.');
    return student;
  }

  async update(id: string, dto: UpdateStudentDto, tenantId: string): Promise<Student> {
    const student = await this.findOne(id, tenantId);

    // Verifica conflito de matrícula se for alterada
    if (dto.registrationNumber && dto.registrationNumber !== student.registrationNumber) {
      const conflict = await this.studentsRepo.findOne({
        where: { registrationNumber: dto.registrationNumber, tenantId },
      });
      if (conflict) throw new ConflictException('Matrícula já cadastrada nesta instituição.');
    }

    Object.assign(student, dto);
    const updated = await this.studentsRepo.save(student);
    this.logger.log(`Aluno atualizado: ${updated.id}`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const student = await this.findOne(id, tenantId);
    await this.studentsRepo.softDelete(student.id);
    this.logger.log(`Aluno removido (soft delete): ${student.id}`);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private computeIsMinor(birthDate: Date): boolean {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return age < 18;
  }
}
