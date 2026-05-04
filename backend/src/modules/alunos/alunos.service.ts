import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { differenceInYears }             from 'date-fns';
import { Aluno, StatusAluno }            from './entities/aluno.entity';
import { CreateAlunoDto }                from './dto/create-aluno.dto';
import { AuthenticatedUser }             from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }                 from '../../common/enums/perfil-usuario.enum';
import { MAIORIDADE_LEGAL }              from '../../common/constants/domain.constants';

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Aluno)
    private readonly repo: Repository<Aluno>,
  ) {}

  criar(dto: CreateAlunoDto): Promise<Aluno> {
    return this.repo.save(this.repo.create(dto));
  }

  // Busca com escopo por campus/segmento conforme perfil (H-08)
  async buscar(matriculaOuNome: string, usuario: AuthenticatedUser): Promise<Aluno[]> {
    const qb = this.repo.createQueryBuilder('a')
      .where('(a.matricula LIKE :q OR a.nome LIKE :q)', { q: `%${matriculaOuNome}%` })
      .andWhere('a.status = :status', { status: StatusAluno.ATIVO });

    if (usuario.perfil !== PerfilUsuario.ADMIN && usuario.perfil !== PerfilUsuario.DIRETOR) {
      qb.andWhere('a.campus = :campus', { campus: usuario.campus });
    }

    return qb.getMany();
  }

  async buscarPorId(id: string): Promise<Aluno> {
    const aluno = await this.repo.findOne({ where: { id } });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');
    return aluno;
  }

  eMenorDeIdade(dataNascimento: Date): boolean {
    return differenceInYears(new Date(), dataNascimento) < MAIORIDADE_LEGAL;
  }
}
