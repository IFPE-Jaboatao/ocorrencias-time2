import { api } from './client';
import { Aluno } from '@/types/ocorrencia.types';

export const alunosApi = {
  buscar: (q: string) =>
    api.get<Aluno[]>('/alunos/buscar', { params: { q } }).then(r => r.data),

  buscarPorId: (id: string) =>
    api.get<Aluno>(`/alunos/${id}`).then(r => r.data),
};
