import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, HttpCode, HttpStatus, ParseUUIDPipe, ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery,
} from '@nestjs/swagger';
import { GuardiansService } from '../services/guardians.service';
import { CreateGuardianDto } from '../dto/guardians/create-guardian.dto';
import { UpdateGuardianDto } from '../dto/guardians/update-guardian.dto';
import { GuardianResponseDto } from '../dto/guardians/guardian-response.dto';
import { Roles, Role } from '../common/decorators/roles.decorator';

@ApiTags('Responsáveis')
@ApiBearerAuth()
@Controller('guardians')
export class GuardiansController {
  constructor(private readonly guardiansService: GuardiansService) {}

  @Post()
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @ApiOperation({ summary: 'Cadastrar responsável legal de forma independente' })
  @ApiResponse({ status: 201, type: GuardianResponseDto })
  async create(@Body() dto: CreateGuardianDto): Promise<GuardianResponseDto> {
    const guardian = await this.guardiansService.create(dto);
    return GuardianResponseDto.from(guardian);
  }

  @Get()
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.SECRETARY)
  @ApiOperation({ summary: 'Listar responsáveis com paginação' })
  @ApiQuery({ name: 'page',  required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page:  number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const { data, total } = await this.guardiansService.findAll({ page, limit });
    return { data: data.map(GuardianResponseDto.from), total, page, limit };
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.COORDINATOR, Role.SECRETARY)
  @ApiOperation({ summary: 'Buscar responsável por ID' })
  @ApiResponse({ status: 200, type: GuardianResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<GuardianResponseDto> {
    const guardian = await this.guardiansService.findOne(id);
    return GuardianResponseDto.from(guardian);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @ApiOperation({ summary: 'Atualizar dados do responsável' })
  @ApiResponse({ status: 200, type: GuardianResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGuardianDto,
  ): Promise<GuardianResponseDto> {
    const guardian = await this.guardiansService.update(id, dto);
    return GuardianResponseDto.from(guardian);
  }

  @Delete(':guardianId/students/:studentId')
  @Roles(Role.ADMIN, Role.COORDINATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desativar vínculo responsável → aluno (H-03)' })
  async deactivateLink(
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @Param('studentId',  ParseUUIDPipe) studentId:  string,
  ): Promise<void> {
    await this.guardiansService.deactivateLink(guardianId, studentId);
  }
}
