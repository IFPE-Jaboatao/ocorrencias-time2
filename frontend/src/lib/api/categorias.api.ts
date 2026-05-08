import { api } from './client';
import type { Segmento } from '@/types/ocorrencia.types';

export interface Subcategoria {
  id:                    string;
  categoriaId:           string;
  nome:                  string;
  severidadePadrao:      number;
  slaHoras:              number;
  exigeValidacao:        boolean;
  exigeNotifResponsavel: boolean;
  obrigatorioLegal:      boolean;
  protocoloExterno:      string | null;
  ativo:                 boolean;
}

export interface Categoria {
  id:                    string;
  nome:                  string;
  subcategorias:         Subcategoria[];
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
  severidadePadrao:       number;
  slaHoras:               number;
  exigeNotifResponsavel?: boolean;
  obrigatorioLegal?:      boolean;
  segmentosAplicaveis:    Segmento[];
  exigeValidacao?:        boolean;
}

export interface CreateSubcategoriaPayload {
  nome:                   string;
  severidadePadrao:       number;
  slaHoras:               number;
  exigeValidacao?:        boolean;
  exigeNotifResponsavel?: boolean;
  obrigatorioLegal?:      boolean;
  protocoloExterno?:      string;
}

export const categoriasApi = {
  listar: (): Promise<Categoria[]> =>
    api.get('/categorias').then(r => r.data),

  criar: (payload: CreateCategoriaPayload): Promise<Categoria> =>
    api.post('/categorias', payload).then(r => r.data),

  desativar: (id: string): Promise<void> =>
    api.delete(`/categorias/${id}`).then(r => r.data),

  listarSubcategorias: (categoriaId: string): Promise<Subcategoria[]> =>
    api.get(`/categorias/${categoriaId}/subcategorias`).then(r => r.data),

  criarSubcategoria: (categoriaId: string, payload: CreateSubcategoriaPayload): Promise<Subcategoria> =>
    api.post(`/categorias/${categoriaId}/subcategorias`, payload).then(r => r.data),

  desativarSubcategoria: (categoriaId: string, subcategoriaId: string): Promise<void> =>
    api.delete(`/categorias/${categoriaId}/subcategorias/${subcategoriaId}`).then(r => r.data),
};
