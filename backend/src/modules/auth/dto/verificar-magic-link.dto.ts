import { ApiProperty }         from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerificarMagicLinkDto {
  @ApiProperty({ description: 'Token recebido por e-mail' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
