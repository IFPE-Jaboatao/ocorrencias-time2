import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuardianRelationship } from '../entities/guardian.entity';

export class GuardianResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiPropertyOptional() phone: string | null;
  @ApiProperty({ enum: GuardianRelationship }) relationship: GuardianRelationship;
  @ApiPropertyOptional() userId: string | null;
  @ApiProperty() createdAt: Date;

  static from(guardian: any): GuardianResponseDto {
    const dto = new GuardianResponseDto();
    dto.id           = guardian.id;
    dto.name         = guardian.name;
    dto.email        = guardian.email;
    dto.phone        = guardian.phone ?? null;
    dto.relationship = guardian.relationship;
    dto.userId       = guardian.userId ?? null;
    dto.createdAt    = guardian.createdAt;
    return dto;
  }
}
