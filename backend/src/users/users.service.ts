import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/decorators/roles.decorator';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateUserDto, tenantId: string): Promise<User> {
    const existing = await this.usersRepo.findOne({
      where: { email: dto.email.toLowerCase().trim(), tenantId },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado nesta instituição.');

    const user = this.usersRepo.create({
      tenantId,
      email: dto.email.toLowerCase().trim(),
      name: dto.name,
      roles: dto.roles,
      isActive: true,
    });
    const saved = await this.usersRepo.save(user);

    // Magic link de primeiro acesso — fire-and-forget
    // (será implementado com o AuthService via evento)
    this.logger.log(`Usuário criado: ${saved.email} [${saved.roles.join(',')}]`);

    return saved;
  }

  async findAll(
    tenantId: string,
    filters: { role?: Role; isActive?: boolean; page?: number; limit?: number },
  ): Promise<{ data: User[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);

    const qb = this.usersRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.deletedAt IS NULL')
      .orderBy('u.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filters.isActive \!== undefined) {
      qb.andWhere('u.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters.role) {
      // MySQL JSON_CONTAINS
      qb.andWhere('JSON_CONTAINS(u.roles, :role)', {
        role: JSON.stringify(filters.role),
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (\!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, tenantId: string): Promise<User> {
    const user = await this.findOne(id, tenantId);
    Object.assign(user, dto);
    return this.usersRepo.save(user);
  }

  async remove(id: string, tenantId: string, requestingUserId: string): Promise<void> {
    const user = await this.findOne(id, tenantId);

    // Proteção: não pode remover o próprio usuário
    if (user.id === requestingUserId) {
      throw new BadRequestException('Você não pode remover sua própria conta.');
    }

    // Proteção: deve existir ao menos 1 ADMIN ativo após a remoção
    if (user.roles.includes(Role.ADMIN)) {
      const adminCount = await this.usersRepo
        .createQueryBuilder('u')
        .where('u.tenantId = :tenantId', { tenantId })
        .andWhere('u.deletedAt IS NULL')
        .andWhere('u.isActive = true')
        .andWhere('JSON_CONTAINS(u.roles, :role)', { role: JSON.stringify(Role.ADMIN) })
        .getCount();

      if (adminCount <= 1) {
        throw new BadRequestException('O último administrador não pode ser removido.');
      }
    }

    await this.usersRepo.softDelete(id);
    this.logger.log(`Usuário removido (soft delete): ${user.email}`);
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email: email.toLowerCase().trim(), tenantId, isActive: true },
    });
  }
}
