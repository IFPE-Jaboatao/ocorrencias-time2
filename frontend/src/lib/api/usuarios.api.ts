import { api } from './client';
import type { PerfilUsuario, Segmento } from '@/types/ocorrencia.types';
import type { Turma } from './turmas.api';

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

export interface UsuarioTurma {
  usuarioId: string;
  turmaId:   string;
  papel:     'PROFESSOR' | 'COORDENADOR_TURMA';
  ativo:     boolean;
  turma:     Turma;
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

  listarTurmas: (id: string): Promise<UsuarioTurma[]> =>
    api.get(`/usuarios/${id}/turmas`).then(r => r.data),

  atualizarTurmas: (id: string, turmaIds: string[]): Promise<UsuarioTurma[]> =>
    api.put(`/usuarios/${id}/turmas`, { turmaIds }).then(r => r.data),

  desativar: (id: string): Promise<void> =>
    api.delete(`/usuarios/${id}`).then(r => r.data),
};
