import { api } from './client';
import type { PerfilUsuario, Segmento } from '@/types/ocorrencia.types';

export interface Usuario {
  id:                     string;
  nome:                   string;
  email:                  string;
  perfil:                 PerfilUsuario;
  campus:                 string;
  segmentosResponsaveis:  Segmento[];
  ativo:                  boolean;
  ultimoAcesso:           string | null;
}

export interface CreateUsuarioPayload {
  nome:                    string;
  email:                   string;
  perfil:                  PerfilUsuario;
  campus:                  string;
  segmentosResponsaveis?:  Segmento[];
}

export const usuariosApi = {
  listar: (): Promise<Usuario[]> =>
    api.get('/usuarios').then(r => r.data),

  criar: (payload: CreateUsuarioPayload): Promise<Usuario> =>
    api.post('/usuarios', payload).then(r => r.data),

  alterarPerfil: (id: string, perfil: PerfilUsuario): Promise<Usuario> =>
    api.patch(`/usuarios/${id}/perfil`, { perfil }).then(r => r.data),

  desativar: (id: string): Promise<void> =>
    api.delete(`/usuarios/${id}`).then(r => r.data),
};
