import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository }   from 'typeorm';
import { Usuario }          from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';
import { UpdateUsuarioTurmasDto } from './dto/update-usuario-turmas.dto';
import { Turma } from '../turmas/entities/turma.entity';
import { PapelUsuarioTurma, UsuarioTurma } from '../turmas/entities/usuario-turma.entity';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
    @InjectRepository(Turma)
    private readonly turmaRepo: Repository<Turma>,
    @InjectRepository(UsuarioTurma)
    private readonly usuarioTurmaRepo: Repository<UsuarioTurma>,
  ) {}

  async criar(dto: CreateUsuarioDto): Promise<Usuario> {
    const existe = await this.repo.findOne({ where: { email: dto.email } });
    if (existe) throw new ConflictException('E-mail já cadastrado');

    return this.repo.save(
      this.repo.create({
        nome:                  dto.nome,
        email:                 dto.email,
        perfil:                dto.perfil,
        campus:                dto.campus,
        segmentosResponsaveis: dto.segmentosResponsaveis ?? [],
      }),
    );
  }

  async listar(): Promise<Usuario[]> {
    return this.repo.find({ where: { ativo: true } });
  }

  async buscarPorId(id: string): Promise<Usuario> {
    const usuario = await this.repo.findOne({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async desativar(id: string): Promise<void> {
    await this.buscarPorId(id);
    await this.repo.update(id, { ativo: false });
  }

  async alterarPerfil(id: string, perfil: PerfilUsuario): Promise<Usuario> {
    await this.buscarPorId(id);
    await this.repo.update(id, { perfil });
    return this.buscarPorId(id);
  }

  async listarTurmas(id: string): Promise<UsuarioTurma[]> {
    await this.buscarPorId(id);
    return this.usuarioTurmaRepo.find({
      where: { usuarioId: id, ativo: true },
      relations: ['turma'],
      order: { turmaId: 'ASC' },
    });
  }

  async atualizarTurmas(id: string, dto: UpdateUsuarioTurmasDto): Promise<UsuarioTurma[]> {
    await this.buscarPorId(id);

    const turmaIds = dto.turmaIds ?? [];
    if (turmaIds.length > 0) {
      const turmasAtivas = await this.turmaRepo.find({
        where: { id: In(turmaIds), ativo: true },
        select: ['id'],
      });
      if (turmasAtivas.length !== turmaIds.length) {
        throw new BadRequestException('Uma ou mais turmas informadas nao existem ou estao inativas');
      }
    }

    await this.usuarioTurmaRepo.manager.transaction(async manager => {
      await manager.update(UsuarioTurma, { usuarioId: id }, { ativo: false });

      for (const turmaId of turmaIds) {
        const existente = await manager.findOne(UsuarioTurma, { where: { usuarioId: id, turmaId } });
        if (existente) {
          await manager.update(UsuarioTurma, { usuarioId: id, turmaId }, {
            ativo: true,
            papel: PapelUsuarioTurma.PROFESSOR,
          });
        } else {
          await manager.save(UsuarioTurma, manager.create(UsuarioTurma, {
            usuarioId: id,
            turmaId,
            papel: PapelUsuarioTurma.PROFESSOR,
            ativo: true,
          }));
        }
      }
    });

    return this.listarTurmas(id);
  }
}
