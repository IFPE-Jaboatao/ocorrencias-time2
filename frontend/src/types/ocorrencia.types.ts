export type PerfilUsuario =
  | 'PROFESSOR' | 'COORDENADOR' | 'EQUIPE_PEDAGOGICA'
  | 'DIRETOR'   | 'SECRETARIA'  | 'ADMIN'
  | 'ALUNO'     | 'RESPONSAVEL_LEGAL';

export type Segmento = 'FUNDAMENTAL' | 'MEDIO' | 'SUPERIOR';

export type StatusOcorrencia =
  | 'ABERTA' | 'AGUARDANDO_VALIDACAO' | 'EM_ACOMPANHAMENTO'
  | 'RESOLVIDA' | 'ARQUIVADA' | 'REVISAO';

export interface Ocorrencia {
  id:                   string;
  codigo:               string;
  alunoId:              string;
  registradorId:        string;
  categoriaId:          string;
  subcategoria:         string | null;
  severidade:           number;
  dataIncidente:        string;
  local:                string;
  descricao:            string;
  status:               StatusOcorrencia;
  cienciaFormalStatus:  string;
  slaPrazo:             string | null;
  dataResolucao:        string | null;
  criadoEm:             string;
}

export type StatusAluno = 'ATIVO' | 'INATIVO' | 'TRANSFERIDO' | 'FORMADO';

export interface Aluno {
  id:              string;
  matricula:       string;
  nome:            string;
  dataNascimento:  string;
  segmento:        Segmento;
  campus:          string;
  curso:           string;
  turma:           string;
  status:          StatusAluno;
  criadoEm?:       string;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface AuthenticatedUser {
  sub:       string;
  email:     string;
  nome:      string;
  perfil:    PerfilUsuario;
  campus:    string;
  segmentos: Segmento[];
}
