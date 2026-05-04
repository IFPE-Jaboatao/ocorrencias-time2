import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { isAfter, addBusinessDays } from 'date-fns';
import { CienciaFormal }   from './entities/ciencia-formal.entity';
import { CIENCIA_FORMAL_TTL_DIAS_UTEIS } from '../../common/constants/domain.constants';

function addBizDays(date: Date, days: number): Date {
  const r = new Date(date);
  let added = 0;
  while (added < days) {
    r.setDate(r.getDate() + 1);
    const dow = r.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return r;
}

@Injectable()
export class CienciaFormalService {
  constructor(
    @InjectRepository(CienciaFormal)
    private readonly repo: Repository<CienciaFormal>,
  ) {}

  async gerar(
    ocorrenciaId:    string,
    destinatarioTipo: 'ALUNO' | 'RESPONSAVEL',
    destinatarioId:   string,
    hashConteudo:     string,
  ): Promise<{ token: string; ciencia: CienciaFormal }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const ciencia = await this.repo.save(
      this.repo.create({ ocorrenciaId, destinatarioTipo, destinatarioId, tokenHash, hashConteudo, dataConfirmacao: null }),
    );
    return { token: rawToken, ciencia };
  }

  // H-07: token SHA-256 single-use com TTL de 5 dias úteis
  async confirmar(rawToken: string, ip: string, userAgent: string): Promise<CienciaFormal> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const ciencia   = await this.repo.findOne({ where: { tokenHash } });

    if (!ciencia) throw new NotFoundException('Token inválido');
    if (ciencia.dataConfirmacao) throw new BadRequestException('Token já utilizado');

    const expira = addBizDays(ciencia.dataEnvio, CIENCIA_FORMAL_TTL_DIAS_UTEIS);
    if (isAfter(new Date(), expira)) throw new BadRequestException('Token expirado');

    ciencia.dataConfirmacao = new Date();
    ciencia.ipConfirmacao   = ip;
    ciencia.userAgent       = userAgent;
    return this.repo.save(ciencia);
  }

  buscarPorToken(rawToken: string): Promise<CienciaFormal | null> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    return this.repo.findOne({ where: { tokenHash }, relations: ['ocorrencia'] });
  }
}
