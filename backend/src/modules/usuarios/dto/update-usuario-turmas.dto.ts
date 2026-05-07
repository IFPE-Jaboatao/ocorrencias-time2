import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class UpdateUsuarioTurmasDto {
  @ApiProperty({ type: [String], description: 'IDs das turmas vinculadas ao usuario' })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  turmaIds: string[];
}
