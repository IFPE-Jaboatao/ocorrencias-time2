import { PerfilUsuario } from '../enums/perfil-usuario.enum';
import { Segmento }      from '../enums/segmento.enum';

export interface AuthenticatedUser {
  sub:       string;
  email:     string;
  nome:      string;
  perfil:    PerfilUsuario;
  campus:    string;
  segmentos: Segmento[];
}
