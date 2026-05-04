import { ApiProperty }        from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SolicitarMagicLinkDto {
  @ApiProperty({ example: 'professor@escola.edu.br' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
