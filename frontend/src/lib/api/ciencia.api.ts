import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const publicApi = axios.create({ baseURL: `${BASE_URL}/api/v1` });

export interface CienciaInfo {
  ocorrencia: {
    codigo:        string;
    dataIncidente: string;
    local:         string;
    descricao:     string;
    severidade:    number;
  };
  destinatario: string;
  dataEnvio:    string;
  confirmado:   boolean;
}

export const cienciaApi = {
  buscarPorToken: (token: string) =>
    publicApi.get<CienciaInfo>(`/ciencia-formal/${token}`).then(r => r.data),

  confirmar: (token: string) =>
    publicApi.post(`/ciencia-formal/${token}/confirmar`).then(r => r.data),
};
