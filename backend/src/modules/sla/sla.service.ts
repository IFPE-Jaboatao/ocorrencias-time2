import { Injectable }              from '@nestjs/common';
import { addHours, addBusinessDays } from 'date-fns';
import {
  SLA_HORAS_CORRIDAS_SEV4,
  SLA_HORAS_CORRIDAS_SEV5,
  SLA_DIAS_UTEIS_SEV1,
  SLA_DIAS_UTEIS_SEV2,
  SLA_DIAS_UTEIS_SEV3,
} from '../../common/constants/domain.constants';

@Injectable()
export class SlaService {
  calcularPrazo(criadoEm: Date, severidade: number): Date {
    if (severidade === 5) return addHours(criadoEm, SLA_HORAS_CORRIDAS_SEV5);
    if (severidade === 4) return addHours(criadoEm, SLA_HORAS_CORRIDAS_SEV4);
    if (severidade === 3) return addBusinessDays(criadoEm, SLA_DIAS_UTEIS_SEV3);
    if (severidade === 2) return addBusinessDays(criadoEm, SLA_DIAS_UTEIS_SEV2);
    return addBusinessDays(criadoEm, SLA_DIAS_UTEIS_SEV1);
  }

  percentualDecorrido(slaPrazo: Date, criadoEm: Date): number {
    const total   = slaPrazo.getTime() - criadoEm.getTime();
    const decor   = Date.now()         - criadoEm.getTime();
    return Math.min(decor / total, 1);
  }
}
