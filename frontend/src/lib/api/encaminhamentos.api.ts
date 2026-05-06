import { api } from './client';

export type StatusEncaminhamento = 'PENDENTE' | 'EXECUTADO' | 'VENCIDO';

export interface Encaminhamento {
  id:                   string;
  ocorrenciaId:         string;
  tipo:                 string;
  responsavelId:        string;
  responsavel?:         { id: string; nome: string; perfil: string };
  prazo:                string;
  descricao:            string;
  status:               StatusEncaminhamento;
  dataExecucao:         string | null;
  resultadoRegistrado:  string | null;
}

export interface CreateEncaminhamentoPayload {
  tipo:          string;
  responsavelId: string;
  prazo:         string;
  descricao:     string;
}

export const encaminhamentosApi = {
  listar: (ocorrenciaId: string): Promise<Encaminhamento[]> =>
    api.get(`/ocorrencias/${ocorrenciaId}/encaminhamentos`).then(r => r.data),

  criar: (ocorrenciaId: string, payload: CreateEncaminhamentoPayload): Promise<Encaminhamento> =>
    api.post(`/ocorrencias/${ocorrenciaId}/encaminhamentos`, payload).then(r => r.data),

  registrarResultado: (ocorrenciaId: string, id: string, resultado: string): Promise<Encaminhamento> =>
    api.patch(`/ocorrencias/${ocorrenciaId}/encaminhamentos/${id}/resultado`, { resultado }).then(r => r.data),
};
