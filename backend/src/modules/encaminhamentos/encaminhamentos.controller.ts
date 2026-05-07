import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { EncaminhamentosService }  from './encaminhamentos.service';
import { CreateEncaminhamentoDto } from './dto/create-encaminhamento.dto';
import { Roles }                   from '../../common/decorators/roles.decorator';
import { PerfilUsuario }           from '../../common/enums/perfil-usuario.enum';

@ApiTags('Encaminhamentos')
@ApiBearerAuth('jwt')
@Controller('ocorrencias/:ocorrenciaId/encaminhamentos')
export class EncaminhamentosController {
  constructor(private readonly service: EncaminhamentosService) {}

  @Post()
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar encaminhamento para ocorrência (RF-05)' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 201, description: 'Encaminhamento criado' })
  @ApiResponse({ status: 400, description: 'DTO inválido (prazo no passado, tipo ausente, etc.)' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão para criar encaminhamentos' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  criar(
    @Param('ocorrenciaId') ocorrenciaId: string,
    @Body() dto: CreateEncaminhamentoDto,
  ) {
    return this.service.criar(ocorrenciaId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar encaminhamentos de uma ocorrência' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Lista de encaminhamentos com responsável populado' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  listar(@Param('ocorrenciaId') ocorrenciaId: string) {
    return this.service.listarPorOcorrencia(ocorrenciaId);
  }

  @Patch(':id/resultado')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar resultado de encaminhamento executado' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiParam({ name: 'id', description: 'UUID do encaminhamento' })
  @ApiResponse({ status: 200, description: 'Status alterado para EXECUTADO com dataExecucao preenchida' })
  @ApiResponse({ status: 400, description: 'Campo "resultado" ausente ou encaminhamento já executado' })
  @ApiResponse({ status: 403, description: 'Perfil sem permissão' })
  @ApiResponse({ status: 404, description: 'Encaminhamento não encontrado' })
  registrarResultado(
    @Param('id') id: string,
    @Body('resultado') resultado: string,
  ) {
    return this.service.registrarResultado(id, resultado);
  }
}
