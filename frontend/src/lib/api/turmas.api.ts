import { api } from './client';
import type { Segmento } from '@/types/ocorrencia.types';

export interface Turma {
  id:        string;
  nome:      string;
  segmento:  Segmento;
  campus:    string;
  curso:     string;
  anoLetivo: number;
  ativo:     boolean;
}

export interface TurmaFiltro {
  campus?:    string;
  segmento?:  Segmento;
  anoLetivo?: number;
}

export const turmasApi = {
  listar: (filtros: TurmaFiltro = {}): Promise<Turma[]> =>
    api.get('/turmas', { params: filtros }).then(r => r.data),
};
