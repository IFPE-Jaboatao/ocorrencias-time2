import { ApiProperty } from '@nestjs/swagger';
import { Expose }       from 'class-transformer';
import { PerfilUsuario } from '../../../common/enums/perfil-usuario.enum';
import { Segmento }      from '../../../common/enums/segmento.enum';

export class UsuarioResponseDto {
  @Expose() @ApiProperty() id: string;
  @Expose() @ApiProperty() nome: string;
  @Expose() @ApiProperty() email: string;
  @Expose() @ApiProperty({ enum: PerfilUsuario }) perfil: PerfilUsuario;
  @Expose() @ApiProperty() campus: string;
  @Expose() @ApiProperty({ type: [String], enum: Segmento }) segmentosResponsaveis: Segmento[];
  @Expose() @ApiProperty() ativo: boolean;
  @Expose() @ApiProperty({ nullable: true }) ultimoAcesso: Date | null;
  @Expose() @ApiProperty() criadoEm: Date;
}
