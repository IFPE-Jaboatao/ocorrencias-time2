import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository }             from 'typeorm';
import { UsuarioTurma } from '../turmas/entities/usuario-turma.entity';
import { subDays, parseISO, isAfter }         from 'date-fns';
import { Ocorrencia }           from './entities/ocorrencia.entity';
import { CreateOcorrenciaDto }  from './dto/create-ocorrencia.dto';
import { FilterOcorrenciaDto }  from './dto/filter-ocorrencia.dto';
import { AlunosService }        from '../alunos/alunos.service';
import { CategoriasService }    from '../categorias/categorias.service';
import { SlaService }           from '../sla/sla.service';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }     from '../../common/enums/status-ocorrencia.enum';
import { Segmento }             from '../../common/enums/segmento.enum';
import {
  DATA_RETROATIVA_MAX_DIAS,
  REINCIDENCIA_JANELA_DIAS,
  REINCIDENCIA_LIMIAR,
} from '../../common/constants/domain.constants';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { EventEmitter2 }        from '@nestjs/event-emitter';

// Transições válidas de status — P-03
const TRANSICOES_VALIDAS: Record<StatusOcorrencia, StatusOcorrencia[]> = {
  [StatusOcorrencia.ABERTA]:               [StatusOcorrencia.AGUARDANDO_VALIDACAO, StatusOcorrencia.EM_ACOMPANHAMENTO],
  [StatusOcorrencia.AGUARDANDO_VALIDACAO]: [StatusOcorrencia.EM_ACOMPANHAMENTO,    StatusOcorrencia.REVISAO],
  [StatusOcorrencia.EM_ACOMPANHAMENTO]:    [StatusOcorrencia.RESOLVIDA],
  [StatusOcorrencia.RESOLVIDA]:            [StatusOcorrencia.ARQUIVADA,             StatusOcorrencia.EM_ACOMPANHAMENTO],
  [StatusOcorrencia.ARQUIVADA]:            [],
  [StatusOcorrencia.REVISAO]:              [StatusOcorrencia.ABERTA],
};

@Injectable()
export class OcorrenciasService {
  constructor(
    @InjectRepository(Ocorrencia)
    private readonly repo: Repository<Ocorrencia>,
    @InjectRepository(UsuarioTurma)
    private readonly usuarioTurmaRepo: Repository<UsuarioTurma>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly alunosService: AlunosService,
    private readonly categoriasService: CategoriasService,
    private readonly slaService: SlaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async criar(dto: CreateOcorrenciaDto, registrador: AuthenticatedUser): Promise<Ocorrencia> {
    // RN-11: data retroativa > 90 dias exige aprovação do diretor
    const dataIncidente = parseISO(dto.dataIncidente);
    const limiteRetro   = subDays(new Date(), DATA_RETROATIVA_MAX_DIAS);
    if (!dto.aprovacaoRetroativaDiretor && isAfter(limiteRetro, dataIncidente)) {
      throw new BadRequestException('RN-11: Data retroativa > 90 dias exige aprovação do Diretor');
    }

    const aluno     = await this.alunosService.buscarPorId(dto.alunoId);
    const categoria = await this.categoriasService.buscarPorId(dto.categoriaId);

    // RN-01: aluno deve ter matrícula ativa
    if (aluno.status !== 'ATIVO') {
      throw new BadRequestException('RN-01: Aluno sem matrícula ativa');
    }

    // RN-07: professor só registra ocorrência de aluno de turma autorizada
    if (registrador.perfil === PerfilUsuario.PROFESSOR) {
      const autorizadas = await this.usuarioTurmaRepo.find({
        where: { usuarioId: registrador.sub, ativo: true },
        relations: ['turma'],
      });
      const podeRegistrar = autorizadas.some(ut =>
        ut.turma.nome === aluno.turma && ut.turma.campus === aluno.campus,
      );
      if (!podeRegistrar) {
        throw new ForbiddenException('Você só pode registrar ocorrências de alunos das suas turmas.');
      }
    }

    const codigo   = await this.gerarCodigo(aluno.segmento);
    const slaPrazo = this.slaService.calcularPrazo(new Date(), dto.severidade);

    // Sev >= 4 vai direto para AGUARDANDO_VALIDACAO
    const statusInicial = dto.severidade >= 4
      ? StatusOcorrencia.AGUARDANDO_VALIDACAO
      : StatusOcorrencia.ABERTA;

    const ocorrencia = await this.repo.save(
      this.repo.create({
        codigo,
        alunoId:       dto.alunoId,
        registradorId: registrador.sub,
        categoriaId:    dto.categoriaId,
        subcategoriaId: dto.subcategoriaId ?? null,
        subcategoria:   dto.subcategoria ?? null,
        severidade:    dto.severidade,
        dataIncidente,
        local:         dto.local,
        descricao:     dto.descricao,
        status:        statusInicial,
        slaPrazo,
      }),
    );

    // RN-03: alerta de reincidência
    const contagem = await this.contarReincidencias(dto.alunoId, dto.categoriaId);
    if (contagem >= REINCIDENCIA_LIMIAR) {
      this.eventEmitter.emit('ocorrencia.reincidencia', { ocorrencia, contagem });
    }

    this.eventEmitter.emit('ocorrencia.criada', { ocorrencia, aluno, categoria, registrador });

    return ocorrencia;
  }

  async listar(filtros: FilterOcorrenciaDto, usuario: AuthenticatedUser): Promise<PaginatedResponseDto<Ocorrencia>> {
    const qb = this.repo.createQueryBuilder('oc')
      .leftJoinAndSelect('oc.aluno',      'aluno')
      .leftJoinAndSelect('oc.categoria',  'cat')
      .leftJoinAndSelect('oc.registrador','reg');

    // H-08: scoping por perfil
    switch (usuario.perfil) {
      case PerfilUsuario.PROFESSOR:
        qb.andWhere('oc.registradorId = :uid', { uid: usuario.sub });
        break;
      case PerfilUsuario.COORDENADOR:
      case PerfilUsuario.EQUIPE_PEDAGOGICA:
      case PerfilUsuario.SECRETARIA:
        qb.andWhere('aluno.campus = :campus', { campus: usuario.campus });
        break;
      case PerfilUsuario.DIRETOR:
      case PerfilUsuario.ADMIN:
        break;
      default:
        throw new ForbiddenException('Você não possui autorização para listar ocorrências.');
    }

    if (filtros.status)        qb.andWhere('oc.status = :status',             { status:      filtros.status });
    if (filtros.alunoId)       qb.andWhere('oc.alunoId = :alunoId',           { alunoId:     filtros.alunoId });
    if (filtros.severidade)    qb.andWhere('oc.severidade = :sev',             { sev:         filtros.severidade });
    if (filtros.categoriaId)   qb.andWhere('oc.categoriaId = :catId',          { catId:       filtros.categoriaId });
    if (filtros.subcategoriaId) qb.andWhere('oc.subcategoriaId = :subcatId',   { subcatId:    filtros.subcategoriaId });
    if (filtros.dataInicio)    qb.andWhere('oc.dataIncidente >= :dataInicio',   { dataInicio:  filtros.dataInicio });
    if (filtros.dataFim)       qb.andWhere('oc.dataIncidente <= :dataFim',      { dataFim:     filtros.dataFim });

    const [data, total] = await qb
      .orderBy('oc.criadoEm', 'DESC')
      .skip((filtros.page - 1) * filtros.pageSize)
      .take(filtros.pageSize)
      .getManyAndCount();

    return PaginatedResponseDto.of(data, total, filtros.page, filtros.pageSize);
  }

  async buscarPorId(id: string, usuario: AuthenticatedUser): Promise<Ocorrencia> {
    const oc = await this.repo.findOne({
      where:     { id },
      relations: ['aluno', 'categoria', 'registrador'],
    });
    if (!oc) throw new NotFoundException('Ocorrência não encontrada');

    // H-08: scoping por perfil — C-02
    switch (usuario.perfil) {
      case PerfilUsuario.PROFESSOR:
        if (oc.registradorId !== usuario.sub) {
          throw new ForbiddenException('Você não possui autorização para visualizar esta ocorrência.');
        }
        break;
      case PerfilUsuario.COORDENADOR:
      case PerfilUsuario.EQUIPE_PEDAGOGICA:
      case PerfilUsuario.SECRETARIA:
        if (oc.aluno?.campus !== usuario.campus) {
          throw new ForbiddenException('Esta ocorrência pertence a outro campus e não pode ser acessada pelo seu perfil.');
        }
        break;
      case PerfilUsuario.DIRETOR:
      case PerfilUsuario.ADMIN:
        break; // visão global
      default:
        throw new ForbiddenException('Você não possui autorização para acessar ocorrências.');
    }
    return oc;
  }

  async alterarStatus(
    id:       string,
    novoStatus: StatusOcorrencia,
    usuario:  AuthenticatedUser,
    justificativa?: string,
  ): Promise<Ocorrencia> {
    const oc = await this.repo.findOneOrFail({ where: { id } });

    // RN-12: arquivada é read-only
    if (oc.status === StatusOcorrencia.ARQUIVADA) {
      throw new ForbiddenException('Ocorrência arquivada não pode ser alterada.');
    }

    validarTransicao(oc.status, novoStatus);

    // RN-04: reabrir ocorrência RESOLVIDA exige perfil ADMIN + justificativa
    if (oc.status === StatusOcorrencia.RESOLVIDA && novoStatus === StatusOcorrencia.EM_ACOMPANHAMENTO) {
      if (usuario.perfil !== PerfilUsuario.ADMIN) {
        throw new ForbiddenException('Apenas o Administrador pode reabrir uma ocorrência já resolvida.');
      }
      if (!justificativa?.trim()) {
        throw new BadRequestException('RN-04: Justificativa obrigatória para reabrir ocorrência resolvida');
      }
    }

    const atualizado = await this.repo.save({
      ...oc,
      status:        novoStatus,
      dataResolucao: novoStatus === StatusOcorrencia.RESOLVIDA ? new Date() : oc.dataResolucao,
    });

    this.eventEmitter.emit('ocorrencia.status_alterado', { ocorrencia: atualizado, statusAnterior: oc.status, usuario });
    return atualizado;
  }

  async alterarSeveridade(
    id: string,
    novaSeveridade: number,
    usuario: AuthenticatedUser,
  ): Promise<Ocorrencia> {
    const oc = await this.repo.findOneOrFail({ where: { id } });

    if (oc.status === StatusOcorrencia.ARQUIVADA) {
      throw new ForbiddenException('Ocorrência arquivada não pode ser alterada.');
    }

    const severidadeAnterior = oc.severidade;
    const atualizado = await this.repo.save({ ...oc, severidade: novaSeveridade });

    this.eventEmitter.emit('ocorrencia.severidade_alterada', {
      ocorrencia: atualizado,
      severidadeAnterior,
      usuario,
    });

    return atualizado;
  }

  // H-13: geração atômica do código único
  async gerarCodigo(segmento: Segmento): Promise<string> {
    const prefixo: Record<Segmento, string> = {
      [Segmento.FUNDAMENTAL]: 'FM',
      [Segmento.MEDIO]:       'ME',
      [Segmento.SUPERIOR]:    'SU',
    };
    const ano = new Date().getFullYear();
    const sig = prefixo[segmento];

    // C-04: INSERT ... ON DUPLICATE KEY + LAST_INSERT_ID() garante atomicidade
    // sem race condition — dois SELECTs separados não são thread-safe
    await this.dataSource.query(
      `INSERT INTO codigo_sequencia (ano, segmento, ultimo_seq) VALUES (?, ?, 1)
       ON DUPLICATE KEY UPDATE ultimo_seq = LAST_INSERT_ID(ultimo_seq + 1)`,
      [ano, sig],
    );
    const [{ seq }] = await this.dataSource.query(
      `SELECT LAST_INSERT_ID() AS seq`,
    );
    // LAST_INSERT_ID() retorna 0 em INSERT bem-sucedido (primeira linha) — corrigir
    const ultimoSeq = Number(seq) === 0 ? 1 : Number(seq);
    return `OC-${ano}-${String(ultimoSeq).padStart(5, '0')}-${sig}`;
  }

  private async contarReincidencias(alunoId: string, categoriaId: string): Promise<number> {
    const desde = subDays(new Date(), REINCIDENCIA_JANELA_DIAS);
    return this.repo.createQueryBuilder('oc')
      .where('oc.alunoId = :alunoId',     { alunoId })
      .andWhere('oc.categoriaId = :catId', { catId: categoriaId })
      .andWhere('oc.criadoEm >= :desde',   { desde })
      .getCount();
  }

  /** RN-03 — histórico de reincidência do aluno nos últimos 30 dias */
  async verificarReincidencias(alunoId: string, usuario: AuthenticatedUser): Promise<{
    totalNoPeriodo: number;
    reincidente:    boolean;
    categorias:     { categoriaId: string; catNome: string; contagem: number; reincidente: boolean }[];
  }> {
    // Verificar que o aluno existe e aplicar campus scoping (C-01)
    const aluno = await this.alunosService.buscarPorId(alunoId);
    if (
      [PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.SECRETARIA].includes(usuario.perfil) &&
      aluno.campus !== usuario.campus
    ) {
      throw new ForbiddenException('Este aluno pertence a outro campus e não pode ser acessado pelo seu perfil.');
    }

    const desde = subDays(new Date(), REINCIDENCIA_JANELA_DIAS);
    const rows  = await this.repo.createQueryBuilder('oc')
      .leftJoinAndSelect('oc.categoria', 'cat')
      .where('oc.alunoId = :alunoId', { alunoId })
      .andWhere('oc.criadoEm >= :desde', { desde })
      .getMany();

    const byCategory: Record<string, { catNome: string; contagem: number }> = {};
    for (const oc of rows) {
      const key = oc.categoriaId;
      if (!byCategory[key]) {
        byCategory[key] = { catNome: oc.categoria?.nome ?? '—', contagem: 0 };
      }
      byCategory[key].contagem++;
    }

    const categorias = Object.entries(byCategory).map(([categoriaId, data]) => ({
      categoriaId,
      catNome:    data.catNome,
      contagem:   data.contagem,
      reincidente: data.contagem >= REINCIDENCIA_LIMIAR,
    }));

    return {
      totalNoPeriodo: rows.length,
      reincidente:    categorias.some(c => c.reincidente),
      categorias,
    };
  }
}

function validarTransicao(atual: StatusOcorrencia, novo: StatusOcorrencia): void {
  if (!TRANSICOES_VALIDAS[atual].includes(novo)) {
    throw new BadRequestException(`Transição inválida: ${atual} → ${novo}`);
  }
}
