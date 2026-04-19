import {
  Injectable, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Guardian } from '../entities/guardian.entity';
import { GuardianStudent } from '../entities/guardian-student.entity';
import { CreateGuardianDto } from '../dto/guardians/create-guardian.dto';
import { UpdateGuardianDto } from '../dto/guardians/update-guardian.dto';

@Injectable()
export class GuardiansService {
  private readonly logger = new Logger(GuardiansService.name);

  constructor(
    @InjectRepository(Guardian)
    private readonly guardiansRepo: Repository<Guardian>,
    @InjectRepository(GuardianStudent)
    private readonly gsRepo: Repository<GuardianStudent>,
  ) {}

  async create(dto: CreateGuardianDto): Promise<Guardian> {
    const guardian = this.guardiansRepo.create({
      name:         dto.name,
      email:        dto.email.toLowerCase().trim(),
      phone:        dto.phone ?? null,
      relationship: dto.relationship,
      userId:       dto.userId ?? null,
    });
    const saved = await this.guardiansRepo.save(guardian);
    this.logger.log(`Responsável criado: ${saved.email}`);
    return saved;
  }

  async findAll(filters: { page?: number; limit?: number }): Promise<{ data: Guardian[]; total: number }> {
    const page  = filters.page  ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const [data, total] = await this.guardiansRepo.findAndCount({
      order: { name: 'ASC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Guardian> {
    const guardian = await this.guardiansRepo.findOne({
      where: { id },
      relations: ['guardianStudents', 'guardianStudents.student'],
    });
    if (!guardian) throw new NotFoundException('Responsável não encontrado.');
    return guardian;
  }

  async findActiveByStudentId(studentId: string): Promise<Guardian[]> {
    const links = await this.gsRepo.find({
      where: { studentId, isActive: true },
      relations: ['guardian'],
    });
    return links.map((gs) => gs.guardian);
  }

  async update(id: string, dto: UpdateGuardianDto): Promise<Guardian> {
    const guardian = await this.findOne(id);
    if (dto.email) dto.email = dto.email.toLowerCase().trim();
    Object.assign(guardian, dto);
    return this.guardiansRepo.save(guardian);
  }

  async deactivateLink(guardianId: string, studentId: string): Promise<void> {
    const link = await this.gsRepo.findOne({ where: { guardianId, studentId } });
    if (!link) throw new NotFoundException('Vínculo não encontrado.');
    link.isActive = false;
    await this.gsRepo.save(link);
    this.logger.log(`Vínculo desativado: responsável ${guardianId} → aluno ${studentId}`);
  }
}
