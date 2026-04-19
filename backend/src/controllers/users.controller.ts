import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, HttpCode, HttpStatus, ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe, ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/users/create-user.dto';
import { UpdateUserDto } from '../dto/users/update-user.dto';
import { UserResponseDto } from '../dto/users/user-response.dto';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Usuários')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (Admin)' })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.create(dto, currentUser.tenantId);
    return UserResponseDto.from(user);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Listar usuários (Admin)' })
  @ApiQuery({ name: 'role', required: false, enum: Role })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() currentUser: User,
    @Query('role') role?: Role,
    @Query('isActive', new DefaultValuePipe(true), ParseBoolPipe) isActive?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    const { data, total } = await this.usersService.findAll(currentUser.tenantId, {
      role, isActive, page, limit,
    });
    return {
      data: data.map(UserResponseDto.from),
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Buscar usuário por ID (Admin)' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.findOne(id, currentUser.tenantId);
    return UserResponseDto.from(user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Atualizar nome, papéis ou status de usuário (Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: User,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.update(id, dto, currentUser.tenantId);
    return UserResponseDto.from(user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário — soft delete (Admin)' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: User,
  ): Promise<void> {
    await this.usersService.remove(id, currentUser.tenantId, currentUser.id);
  }
}
