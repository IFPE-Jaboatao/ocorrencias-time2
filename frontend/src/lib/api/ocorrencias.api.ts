import { api } from './client';
import { Ocorrencia, PaginatedResponse } from '@/types/ocorrencia.types';

export interface CreateOcorrenciaPayload {
  alunoId:        string;
  categoriaId:    string;
  subcategoriaId?: string;
  subcategoria?:  string;
  severidade:     number;
  dataIncidente:  string;
  local:          string;
  descricao:      string;
}

export interface FilterParams {
  status?:        string;
  alunoId?:       string;
  severidade?:    number;
  categoriaId?:   string;
  subcategoriaId?: string;
  dataInicio?:    string;
  dataFim?:       string;
  page?:          number;
  pageSize?:      number;
}

export interface ReincidenciaInfo {
  totalNoPeriodo: number;
  reincidente:    boolean;
  categorias: {
    categoriaId: string;
    catNome:     string;
    contagem:    number;
    reincidente: boolean;
  }[];
}

export const ocorrenciasApi = {
  listar: (params?: FilterParams) =>
    api.get<PaginatedResponse<Ocorrencia>>('/ocorrencias', { params }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Ocorrencia>(`/ocorrencias/${id}`).then(r => r.data),

  criar: (payload: CreateOcorrenciaPayload) =>
    api.post<Ocorrencia>('/ocorrencias', payload).then(r => r.data),

  alterarStatus: (id: string, status: string, justificativa?: string) =>
    api.patch<Ocorrencia>(`/ocorrencias/${id}/status`, { status, justificativa }).then(r => r.data),

  verificarReincidencias: (alunoId: string) =>
    api.get<ReincidenciaInfo>(`/ocorrencias/alunos/${alunoId}/reincidencias`).then(r => r.data),
};
