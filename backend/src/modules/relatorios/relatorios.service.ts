import { Injectable }         from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import { Repository }         from 'typeorm';
import { differenceInYears }  from 'date-fns';
import { Ocorrencia, CienciaFormalStatus } from '../ocorrencias/entities/ocorrencia.entity';
import { FiltroRelatorioDto } from './dto/filtro-relatorio.dto';
import { MAIORIDADE_LEGAL }   from '../../common/constants/domain.constants';

export interface ResumoRelatorio {
  totalOcorrencias:  number;
  porStatus:         Record<string, number>;
  porSeveridade:     Record<string, number>;
  porSegmento:       Record<string, number>;
  porCategoria:      { nome: string; total: number }[];
  slaVencidas:       number;
  periodo:           { inicio: string; fim: string };
}

@Injectable()
export class RelatoriosService {
  constructor(
    @InjectRepository(Ocorrencia)
    private readonly ocorrenciaRepo: Repository<Ocorrencia>,
  ) {}

  private buildQuery(filtros: FiltroRelatorioDto) {
    const qb = this.ocorrenciaRepo
      .createQueryBuilder('oc')
      .leftJoinAndSelect('oc.aluno',     'aluno')
      .leftJoinAndSelect('oc.categoria', 'cat')
      .leftJoinAndSelect('oc.registrador', 'reg');

    if (filtros.dataInicio) {
      qb.andWhere('oc.criadoEm >= :dataInicio', { dataInicio: filtros.dataInicio });
    }
    if (filtros.dataFim) {
      qb.andWhere('oc.criadoEm <= :dataFim', { dataFim: filtros.dataFim + ' 23:59:59' });
    }
    if (filtros.status) {
      qb.andWhere('oc.status = :status', { status: filtros.status });
    }
    if (filtros.severidade) {
      qb.andWhere('oc.severidade = :sev', { sev: filtros.severidade });
    }
    if (filtros.segmento) {
      qb.andWhere('aluno.segmento = :seg', { seg: filtros.segmento });
    }
    if (filtros.campus) {
      qb.andWhere('aluno.campus = :campus', { campus: filtros.campus });
    }
    if (filtros.categoriaId) {
      qb.andWhere('oc.categoriaId = :catId', { catId: filtros.categoriaId });
    }
    if (filtros.subcategoriaId) {
      qb.andWhere('oc.subcategoriaId = :subcatId', { subcatId: filtros.subcategoriaId });
    }

    return qb;
  }

  async resumo(filtros: FiltroRelatorioDto): Promise<ResumoRelatorio> {
    const ocorrencias = await this.buildQuery(filtros)
      .orderBy('oc.criadoEm', 'DESC')
      .getMany();

    const agora = new Date();

    const porStatus: Record<string, number>    = {};
    const porSeveridade: Record<string, number> = {};
    const porSegmento: Record<string, number>   = {};
    const porCategoriaMap: Record<string, number> = {};
    let slaVencidas = 0;

    for (const oc of ocorrencias) {
      // Por status
      porStatus[oc.status] = (porStatus[oc.status] ?? 0) + 1;

      // Por severidade
      const sevKey = `${oc.severidade}`;
      porSeveridade[sevKey] = (porSeveridade[sevKey] ?? 0) + 1;

      // Por segmento
      const seg = oc.aluno?.segmento ?? 'DESCONHECIDO';
      porSegmento[seg] = (porSegmento[seg] ?? 0) + 1;

      // Por categoria
      const catNome = oc.categoria?.nome ?? 'Sem categoria';
      porCategoriaMap[catNome] = (porCategoriaMap[catNome] ?? 0) + 1;

      // SLA vencidas
      if (
        oc.slaPrazo &&
        new Date(oc.slaPrazo) < agora &&
        !['RESOLVIDA', 'ARQUIVADA'].includes(oc.status)
      ) {
        slaVencidas++;
      }
    }

    const porCategoria = Object.entries(porCategoriaMap)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total);

    return {
      totalOcorrencias: ocorrencias.length,
      porStatus,
      porSeveridade,
      porSegmento,
      porCategoria,
      slaVencidas,
      periodo: {
        inicio: filtros.dataInicio ?? '—',
        fim:    filtros.dataFim    ?? '—',
      },
    };
  }

  async exportarCsv(filtros: FiltroRelatorioDto): Promise<string> {
    const ocorrencias = await this.buildQuery(filtros)
      .orderBy('oc.criadoEm', 'DESC')
      .getMany();

    const header = [
      'Código', 'Data Incidente', 'Aluno', 'Segmento', 'Campus',
      'Categoria', 'Subcategoria', 'Severidade', 'Status',
      'SLA Prazo', 'SLA Vencida', 'Data Resolução', 'Registrador', 'Registrado Em',
    ].join(';');

    const agora = new Date();

    const rows = ocorrencias.map(oc => {
      const slaVencida = oc.slaPrazo &&
        new Date(oc.slaPrazo) < agora &&
        !['RESOLVIDA', 'ARQUIVADA'].includes(oc.status);

      // C-03 / RN-10: pseudonimizar nome do aluno menor sem ciência formal confirmada (LGPD art. 13)
      const eMenor = oc.aluno?.dataNascimento
        ? differenceInYears(new Date(), new Date(oc.aluno.dataNascimento)) < MAIORIDADE_LEGAL
        : false;
      const semCiencia = oc.cienciaFormalStatus !== CienciaFormalStatus.CONFIRMADA;
      const nomeAluno  = (eMenor && semCiencia)
        ? `Aluno ${oc.alunoId.slice(0, 8).toUpperCase()}`
        : (oc.aluno?.nome ?? '');

      return [
        oc.codigo,
        oc.dataIncidente ? String(oc.dataIncidente).slice(0, 10) : '',
        nomeAluno,
        oc.aluno?.segmento ?? '',
        oc.aluno?.campus ?? '',
        oc.categoria?.nome ?? '',
        oc.subcategoria ?? '',
        String(oc.severidade),
        oc.status,
        oc.slaPrazo ? String(oc.slaPrazo).slice(0, 16).replace('T', ' ') : '',
        slaVencida ? 'Sim' : 'Não',
        oc.dataResolucao ? String(oc.dataResolucao).slice(0, 10) : '',
        oc.registrador?.nome ?? '',
        String(oc.criadoEm).slice(0, 16).replace('T', ' '),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';');
    });

    return [header, ...rows].join('\r\n');
  }
}
