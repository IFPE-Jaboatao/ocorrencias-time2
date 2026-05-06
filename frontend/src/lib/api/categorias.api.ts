import { api } from './client';
import type { Segmento } from '@/types/ocorrencia.types';

export interface Categoria {
  id:                    string;
  nome:                  string;
  subcategorias:         string[];
  severidadePadrao:      number;
  slaHoras:              number;
  exigeValidacao:        boolean;
  exigeNotifResponsavel: boolean;
  obrigatorioLegal:      boolean;
  segmentosAplicaveis:   Segmento[];
  ativo:                 boolean;
}

export interface CreateCategoriaPayload {
  nome:                   string;
  subcategorias?:         string[];
  severidadePadrao:       number;
  slaHoras:               number;
  exigeNotifResponsavel?: boolean;
  obrigatorioLegal?:      boolean;
  segmentosAplicaveis:    Segmento[];
  exigeValidacao?:        boolean;
}

export const categoriasApi = {
  listar: (): Promise<Categoria[]> =>
    api.get('/categorias').then(r => r.data),

  criar: (payload: CreateCategoriaPayload): Promise<Categoria> =>
    api.post('/categorias', payload).then(r => r.data),

  desativar: (id: string): Promise<void> =>
    api.delete(`/categorias/${id}`).then(r => r.data),
};
