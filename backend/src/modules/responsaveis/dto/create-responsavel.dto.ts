import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateResponsavelDto {
  @ApiProperty() @IsUUID()           alunoId: string;
  @ApiProperty() @IsString() @IsNotEmpty() nome: string;
  @ApiProperty() @IsString() @IsNotEmpty() parentesco: string;
  @ApiProperty() @IsEmail()          email: string;
  @ApiProperty() @IsString() @IsNotEmpty() telefone: string;
  @ApiPropertyOptional({ default: true })
  @IsOptional() @IsBoolean()         receberNotificacoes?: boolean;
}
