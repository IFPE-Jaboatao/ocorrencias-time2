import { api } from './client';

export interface Categoria {
  id:              string;
  nome:            string;
  subcategorias:   string[];
  severidadePadrao: number;
  slaHoras:        number;
  exigeValidacao:  boolean;
  ativo:           boolean;
}

export const categoriasApi = {
  listar: () => api.get<Categoria[]>('/categorias').then(r => r.data),
};
