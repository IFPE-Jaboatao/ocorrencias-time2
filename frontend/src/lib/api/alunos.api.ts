import { api } from './client';
import type { Aluno, PaginatedResponse } from '@/types/ocorrencia.types';

export interface FilterAluno {
  q?:        string;
  segmento?: string;
  status?:   string;
  campus?:   string;
  page?:     number;
  pageSize?: number;
}

export const alunosApi = {
  getOpcoes: () =>
    api.get<{ campi: string[]; cursos: string[] }>('/alunos/opcoes').then(r => r.data),

  buscar: (q = '') =>
    api.get<Aluno[]>('/alunos/buscar', { params: { q } }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Aluno>(`/alunos/${id}`).then(r => r.data),

  listar: (filtros: FilterAluno = {}) =>
    api.get<PaginatedResponse<Aluno>>('/alunos', { params: filtros }).then(r => r.data),

  criar: (dto: Omit<Aluno, 'id' | 'status'> & { status?: string }) =>
    api.post<Aluno>('/alunos', dto).then(r => r.data),

  atualizar: (id: string, dto: Partial<Omit<Aluno, 'id' | 'matricula'>>) =>
    api.patch<Aluno>(`/alunos/${id}`, dto).then(r => r.data),

  importar: (arquivo: File) => {
    const fd = new FormData();
    fd.append('arquivo', arquivo);
    return api.post<{ importados: number; ignorados: number; erros: string[] }>(
      '/alunos/importar', fd,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    ).then(r => r.data);
  },

  downloadTemplate: () =>
    api.get('/alunos/template', { responseType: 'blob' }).then(r => r.data as Blob),
};
