import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationLevel } from '../../entities/student.entity';
import { GuardianResponseDto } from '../guardians/guardian-response.dto';

export class StudentResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() tenantId: string;
  @ApiProperty() name: string;
  @ApiProperty() registrationNumber: string;
  @ApiProperty() birthDate: Date;
  @ApiProperty() isMinor: boolean;
  @ApiProperty({ enum: EducationLevel }) educationLevel: EducationLevel;
  @ApiPropertyOptional() className: string | null;
  @ApiPropertyOptional() campus: string | null;
  @ApiPropertyOptional() userId: string | null;
  @ApiPropertyOptional({ type: [GuardianResponseDto] }) guardians: GuardianResponseDto[];
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static from(student: any): StudentResponseDto {
    const dto = new StudentResponseDto();
    dto.id                 = student.id;
    dto.tenantId           = student.tenantId;
    dto.name               = student.name;
    dto.registrationNumber = student.registrationNumber;
    dto.birthDate          = student.birthDate;
    dto.isMinor            = student.isMinor;
    dto.educationLevel     = student.educationLevel;
    dto.className          = student.className ?? null;
    dto.campus             = student.campus ?? null;
    dto.userId             = student.userId ?? null;
    dto.createdAt          = student.createdAt;
    dto.updatedAt          = student.updatedAt;

    // Mapeia responsáveis ativos a partir da junção, se carregado
    if (Array.isArray(student.guardianStudents)) {
      dto.guardians = student.guardianStudents
        .filter((gs: any) => gs.isActive && gs.guardian)
        .map((gs: any) => GuardianResponseDto.from(gs.guardian));
    } else {
      dto.guardians = [];
    }

    return dto;
  }
}
