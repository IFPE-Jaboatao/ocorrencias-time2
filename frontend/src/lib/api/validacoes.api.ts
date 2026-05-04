import { api } from './client';

export type TipoDecisao = 'VALIDAR' | 'DEVOLVER' | 'ESCALAR';

export interface ValidarPayload {
  tipoDecisao:        TipoDecisao;
  justificativa:      string;
  severidadeNova?:    number;
}

export const validacoesApi = {
  validar: (ocorrenciaId: string, payload: ValidarPayload) =>
    api.post(`/ocorrencias/${ocorrenciaId}/validacoes`, payload).then(r => r.data),
};
