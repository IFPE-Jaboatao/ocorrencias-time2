import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OcorrenciasService }   from './ocorrencias.service';
import { CreateOcorrenciaDto }  from './dto/create-ocorrencia.dto';
import { FilterOcorrenciaDto }  from './dto/filter-ocorrencia.dto';
import { OcorrenciaResponseDto } from './dto/ocorrencia-response.dto';
import { Roles }                from '../../common/decorators/roles.decorator';
import { CurrentUser }          from '../../common/decorators/current-user.decorator';
import { Serialize }            from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }     from '../../common/enums/status-ocorrencia.enum';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Ocorrências')
@ApiBearerAuth('jwt')
@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly service: OcorrenciasService) {}

  @Post()
  @Roles(PerfilUsuario.PROFESSOR, PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Registrar nova ocorrência (RF-03)' })
  @ApiResponse({ status: 201, type: OcorrenciaResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido ou RN violada' })
  @ApiResponse({ status: 403, description: 'Sem permissão' })
  criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.criar(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências com escopo do usuário (RF-06)' })
  listar(@Query() filtros: FilterOcorrenciaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listar(filtros, user);
  }

  // Rota específica DEVE vir antes de ':id' — evitar ambiguidade de segmento
  @Get('alunos/:alunoId/reincidencias')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Verificar reincidência do aluno nos últimos 30 dias (RN-03)' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão' })
  verificarReincidencias(
    @Param('alunoId') alunoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.verificarReincidencias(alunoId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ocorrência por ID' })
  buscarPorId(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.buscarPorId(id, user);
  }

  @Patch(':id/status')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Alterar status da ocorrência (RF-06)' })
  alterarStatus(
    @Param('id') id: string,
    @Body('status') status: StatusOcorrencia,
    @Body('justificativa') justificativa: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.alterarStatus(id, status, user, justificativa);
  }
}
