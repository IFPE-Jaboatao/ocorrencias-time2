import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateEncaminhamentoDto {
  @ApiProperty({ example: 'Encaminhar para psicólogo escolar' })
  @IsString() @IsNotEmpty()
  tipo: string;

  @ApiProperty() @IsUUID()
  responsavelId: string;

  @ApiProperty({ example: '2026-05-10' })
  @IsDateString()
  prazo: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  descricao: string;
}
