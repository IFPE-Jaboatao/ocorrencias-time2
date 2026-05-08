import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { OcorrenciasService }    from './ocorrencias.service';
import { CreateOcorrenciaDto }   from './dto/create-ocorrencia.dto';
import { FilterOcorrenciaDto }   from './dto/filter-ocorrencia.dto';
import { OcorrenciaResponseDto } from './dto/ocorrencia-response.dto';
import { Roles }                 from '../../common/decorators/roles.decorator';
import { CurrentUser }           from '../../common/decorators/current-user.decorator';
import { Serialize }             from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }         from '../../common/enums/perfil-usuario.enum';
import { StatusOcorrencia }      from '../../common/enums/status-ocorrencia.enum';
import { AuthenticatedUser }     from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Ocorrências')
@ApiBearerAuth('jwt')
@Controller('ocorrencias')
export class OcorrenciasController {
  constructor(private readonly service: OcorrenciasService) {}

  @Post()
  // RBAC §11: ADMIN gere configurações, não registra ocorrências
  @Roles(PerfilUsuario.PROFESSOR, PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Registrar nova ocorrência (RF-03)' })
  @ApiResponse({ status: 201, description: 'Ocorrência criada. Código gerado no formato OC-AAAA-NNNNN-SS.', type: OcorrenciaResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido; aluno sem matrícula ativa (RN-01); data retroativa > 90 dias sem aprovação do Diretor (RN-11)' })
  @ApiResponse({ status: 403, description: 'RN-07: Professor tentou registrar ocorrência de aluno de outro campus; ou perfil sem permissão' })
  @ApiResponse({ status: 404, description: 'Aluno ou categoria não encontrados' })
  criar(@Body() dto: CreateOcorrenciaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.criar(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ocorrências com escopo por perfil — paginado e filtrado (RF-06, H-08)' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada. Professor vê apenas as suas; Coordenador/Equipe/Secretaria veem o campus; Diretor/Admin veem tudo.',
    type: OcorrenciaResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Perfil sem acesso a listagem de ocorrências' })
  listar(@Query() filtros: FilterOcorrenciaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listar(filtros, user);
  }

  // Rota específica DEVE vir antes de ':id' — evitar ambiguidade de segmento
  @Get('alunos/:alunoId/reincidencias')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Verificar reincidência do aluno nos últimos 30 dias (RN-03)' })
  @ApiParam({ name: 'alunoId', description: 'UUID do aluno' })
  @ApiResponse({
    status: 200,
    description: 'Totais por categoria e flag "reincidente" (true se ≥ 3 ocorrências da mesma categoria em 30 dias)',
    schema: {
      example: {
        totalNoPeriodo: 5,
        reincidente: true,
        categorias: [{ categoriaId: 'uuid', catNome: 'Disciplinar', contagem: 3, reincidente: true }],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Acesso negado: aluno de outro campus ou perfil sem permissão' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  verificarReincidencias(
    @Param('alunoId') alunoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.verificarReincidencias(alunoId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ocorrência por ID — com validação de escopo (H-08)' })
  @ApiParam({ name: 'id', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Dados completos da ocorrência com aluno, categoria e registrador', type: OcorrenciaResponseDto })
  @ApiResponse({ status: 403, description: 'Acesso negado: Professor tentou acessar ocorrência de outro registrador; Coordenador tentou acessar outro campus' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  buscarPorId(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.buscarPorId(id, user);
  }

  @Patch(':id/status')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Alterar status da ocorrência — respeita máquina de estados (RF-06, P-03)' })
  @ApiParam({ name: 'id', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Status alterado com sucesso', type: OcorrenciaResponseDto })
  @ApiResponse({ status: 400, description: 'Transição de status inválida (P-03); ou justificativa ausente ao reabrir (RN-04)' })
  @ApiResponse({ status: 403, description: 'RN-04: Apenas ADMIN pode reabrir ocorrência RESOLVIDA; RN-12: ocorrência ARQUIVADA é read-only' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  alterarStatus(
    @Param('id') id: string,
    @Body('status') status: StatusOcorrencia,
    @Body('justificativa') justificativa: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.alterarStatus(id, status, user, justificativa);
  }
}
