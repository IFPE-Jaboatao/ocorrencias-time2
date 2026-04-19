import {
  IsDateString, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationLevel } from '../../entities/student.entity';
import { CreateGuardianDto } from '../guardians/create-guardian.dto';

export class CreateStudentDto {
  @ApiProperty({ example: 'Pedro Oliveira' })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres.' })
  name: string;

  @ApiProperty({ example: '2024001' })
  @IsString()
  registrationNumber: string;

  @ApiProperty({ example: '2010-05-20', description: 'Data de nascimento (ISO 8601)' })
  @IsDateString({}, { message: 'Informe uma data válida no formato YYYY-MM-DD.' })
  birthDate: string;

  @ApiProperty({ enum: EducationLevel, example: EducationLevel.FUNDAMENTAL_FINAL })
  @IsEnum(EducationLevel, { message: 'Nível de ensino inválido.' })
  educationLevel: EducationLevel;

  @ApiPropertyOptional({ example: '8A' })
  @IsOptional()
  @IsString()
  className?: string;

  @ApiPropertyOptional({ example: 'Campus Centro' })
  @IsOptional()
  @IsString()
  campus?: string;

  @ApiPropertyOptional({ description: 'UUID do usuário do sistema, se já cadastrado' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    type: () => CreateGuardianDto,
    description: 'Obrigatório quando o aluno é menor de 18 anos (RN-02)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateGuardianDto)
  guardian?: CreateGuardianDto;
}
