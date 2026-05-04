import { Injectable }      from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Ocorrencia }       from '../ocorrencias/entities/ocorrencia.entity';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia } from '../../common/enums/status-ocorrencia.enum';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Ocorrencia)
    private readonly repo: Repository<Ocorrencia>,
  ) {}

  async resumo(usuario: AuthenticatedUser) {
    const qb = this.repo.createQueryBuilder('oc')
      .leftJoin('oc.aluno', 'aluno');

    if (usuario.perfil === PerfilUsuario.PROFESSOR) {
      qb.where('oc.registradorId = :uid', { uid: usuario.sub });
    } else if (
      usuario.perfil !== PerfilUsuario.ADMIN &&
      usuario.perfil !== PerfilUsuario.DIRETOR
    ) {
      qb.where('aluno.campus = :campus', { campus: usuario.campus });
    }

    const [abertas, aguardandoValidacao, emAcompanhamento, vencidas] = await Promise.all([
      qb.clone().andWhere('oc.status = :s', { s: StatusOcorrencia.ABERTA }).getCount(),
      qb.clone().andWhere('oc.status = :s', { s: StatusOcorrencia.AGUARDANDO_VALIDACAO }).getCount(),
      qb.clone().andWhere('oc.status = :s', { s: StatusOcorrencia.EM_ACOMPANHAMENTO }).getCount(),
      qb.clone()
        .andWhere('oc.slaPrazo < :agora', { agora: new Date() })
        .andWhere('oc.status NOT IN (:...finais)', { finais: [StatusOcorrencia.RESOLVIDA, StatusOcorrencia.ARQUIVADA] })
        .getCount(),
    ]);

    return { abertas, aguardandoValidacao, emAcompanhamento, slaVencidas: vencidas };
  }

  async porSeveridade(usuario: AuthenticatedUser) {
    const qb = this.repo.createQueryBuilder('oc')
      .select('oc.severidade', 'severidade')
      .addSelect('COUNT(*)', 'total')
      .leftJoin('oc.aluno', 'aluno')
      .groupBy('oc.severidade');

    if (usuario.perfil !== PerfilUsuario.ADMIN && usuario.perfil !== PerfilUsuario.DIRETOR) {
      qb.where('aluno.campus = :campus', { campus: usuario.campus });
    }

    return qb.getRawMany();
  }
}
