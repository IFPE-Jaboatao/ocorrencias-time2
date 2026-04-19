import { IsEmail, IsEnum, IsArray, IsString, MinLength, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/decorators/roles.decorator';

export class CreateUserDto {
  @ApiProperty({ example: 'professor@escola.edu.br' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email: string;

  @ApiProperty({ example: 'Prof. João Silva' })
  @IsString()
  @MinLength(3, { message: 'Nome deve ter no mínimo 3 caracteres.' })
  name: string;

  @ApiProperty({ enum: Role, isArray: true, example: [Role.TEACHER] })
  @IsArray()
  @ArrayNotEmpty({ message: 'Informe pelo menos um papel.' })
  @IsEnum(Role, { each: true, message: 'Papel inválido.' })
  roles: Role[];
}
