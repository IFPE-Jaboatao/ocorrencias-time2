import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/decorators/roles.decorator';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: Role, isArray: true }) roles: Role[];
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;

  static from(user: any): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.name = user.name;
    dto.roles = user.roles;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
