import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TurmasService } from './turmas.service';
import { CreateTurmaDto } from './dto/create-turma.dto';
import { FilterTurmaDto } from './dto/filter-turma.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { PerfilUsuario } from '../../common/enums/perfil-usuario.enum';

@ApiTags('Turmas')
@ApiBearerAuth('jwt')
@Controller('turmas')
export class TurmasController {
  constructor(private readonly service: TurmasService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @ApiOperation({ summary: 'Criar turma para escopo de alunos e professores' })
  @ApiResponse({ status: 201, description: 'Turma criada' })
  criar(@Body() dto: CreateTurmaDto) {
    return this.service.criar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar turmas ativas com filtros' })
  listar(@Query() filtros: FilterTurmaDto) {
    return this.service.listar(filtros);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar turma por ID' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
