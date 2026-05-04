import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Usuario }          from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly repo: Repository<Usuario>,
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
}
