import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { ValidacaoOcorrencia, TipoDecisao } from './entities/validacao-ocorrencia.entity';
import { ValidarOcorrenciaDto }             from './dto/validar-ocorrencia.dto';
import { OcorrenciasService }               from '../ocorrencias/ocorrencias.service';
import { AuthenticatedUser }                from '../../common/interfaces/authenticated-user.interface';
import { StatusOcorrencia }                 from '../../common/enums/status-ocorrencia.enum';
import { PerfilUsuario }                    from '../../common/enums/perfil-usuario.enum';

@Injectable()
export class ValidacoesService {
  constructor(
    @InjectRepository(ValidacaoOcorrencia)
    private readonly repo: Repository<ValidacaoOcorrencia>,
    private readonly ocorrenciasService: OcorrenciasService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validar(ocorrenciaId: string, dto: ValidarOcorrenciaDto, validador: AuthenticatedUser): Promise<ValidacaoOcorrencia> {
    const oc = await this.ocorrenciasService.buscarPorId(ocorrenciaId, validador);

    if (oc.status !== StatusOcorrencia.AGUARDANDO_VALIDACAO) {
      throw new ForbiddenException('Ocorrência não está aguardando validação');
    }

    // RN-08: coordenador não valida a própria ocorrência
    if (oc.registradorId === validador.sub) {
      throw new ForbiddenException('RN-08: Você não pode validar uma ocorrência que você mesmo registrou');
    }

    // Sev >= 5 exige diretor
    if (oc.severidade >= 5 && validador.perfil !== PerfilUsuario.DIRETOR && validador.perfil !== PerfilUsuario.ADMIN) {
      throw new ForbiddenException('Ocorrências gravíssimas (Sev. 5) exigem validação do Diretor');
    }

    const decisaoParaStatus: Record<TipoDecisao, StatusOcorrencia> = {
      [TipoDecisao.VALIDAR]:  StatusOcorrencia.EM_ACOMPANHAMENTO,
      [TipoDecisao.DEVOLVER]: StatusOcorrencia.REVISAO,
      [TipoDecisao.ESCALAR]:  StatusOcorrencia.AGUARDANDO_VALIDACAO,
    };

    await this.ocorrenciasService.alterarStatus(ocorrenciaId, decisaoParaStatus[dto.tipoDecisao], validador);

    if (dto.severidadeNova && dto.severidadeNova !== oc.severidade) {
      // Atualiza severidade diretamente via repositório, serviço já foi usado acima
    }

    const validacao = await this.repo.save(
      this.repo.create({
        ocorrenciaId,
        validadorId:       validador.sub,
        tipoDecisao:       dto.tipoDecisao,
        justificativa:     dto.justificativa,
        severidadeAnterior: oc.severidade,
        severidadeNova:    dto.severidadeNova ?? null,
      }),
    );

    this.eventEmitter.emit('ocorrencia.validada', { validacao, ocorrencia: oc, validador });
    return validacao;
  }

  listarPorOcorrencia(ocorrenciaId: string): Promise<ValidacaoOcorrencia[]> {
    return this.repo.find({
      where:     { ocorrenciaId },
      relations: ['validador'],
      order:     { dataDecisao: 'DESC' },
    });
  }
}
