import { api } from './client';
import type { Segmento } from '@/types/ocorrencia.types';

export type Turno = 'MANHA' | 'TARDE' | 'NOITE' | 'INTEGRAL';

export interface Turma {
  id:        string;
  nome:      string;
  segmento:  Segmento;
  campus:    string;
  curso:     string;
  anoLetivo: number;
  turno:     Turno | null;
  ativo:     boolean;
}

export interface TurmaFiltro {
  campus?:    string;
  segmento?:  Segmento;
  anoLetivo?: number;
}

export interface CreateTurmaPayload {
  nome:      string;
  segmento:  Segmento;
  campus:    string;
  curso:     string;
  anoLetivo: number;
  turno?:    Turno;
}

export const turmasApi = {
  listar: (filtros: TurmaFiltro = {}): Promise<Turma[]> =>
    api.get('/turmas', { params: filtros }).then(r => r.data),
  criar: (payload: CreateTurmaPayload): Promise<Turma> =>
    api.post('/turmas', payload).then(r => r.data),
};
