import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationship } from '../../entities/guardian.entity';

export class CreateGuardianDto {
  @ApiProperty({ example: 'Maria da Silva' })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres.' })
  name: string;

  @ApiProperty({ example: 'maria.silva@email.com' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiPropertyOptional({ example: '(11) 99999-0000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: GuardianRelationship, example: GuardianRelationship.MAE })
  @IsEnum(GuardianRelationship, { message: 'Tipo de parentesco inválido.' })
  relationship: GuardianRelationship;

  @ApiPropertyOptional({ description: 'UUID do usuário do sistema, se já cadastrado' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
