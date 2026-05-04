import { api } from './client';
import { Ocorrencia, PaginatedResponse } from '@/types/ocorrencia.types';

export interface CreateOcorrenciaPayload {
  alunoId:      string;
  categoriaId:  string;
  subcategoria?: string;
  severidade:   number;
  dataIncidente: string;
  local:        string;
  descricao:    string;
}

export interface FilterParams {
  status?:    string;
  alunoId?:   string;
  severidade?: number;
  page?:      number;
  pageSize?:  number;
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
};
