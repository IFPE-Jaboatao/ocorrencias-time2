import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ValidacoesService }    from './validacoes.service';
import { ValidarOcorrenciaDto } from './dto/validar-ocorrencia.dto';
import { Roles }                from '../../common/decorators/roles.decorator';
import { CurrentUser }          from '../../common/decorators/current-user.decorator';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Validações')
@ApiBearerAuth('jwt')
@Controller('ocorrencias/:ocorrenciaId/validacoes')
export class ValidacoesController {
  constructor(private readonly service: ValidacoesService) {}

  @Post()
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Validar, devolver ou escalar ocorrência (RF-04)' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência a validar' })
  @ApiResponse({ status: 201, description: 'Decisão registrada com sucesso' })
  @ApiResponse({ status: 400, description: 'Justificativa insuficiente (mín. 30 chars) ou transição inválida' })
  @ApiResponse({ status: 403, description: 'RN-08: Coordenador não pode validar sua própria ocorrência; ou perfil sem permissão' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  validar(
    @Param('ocorrenciaId') id: string,
    @Body() dto: ValidarOcorrenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.validar(id, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de validações da ocorrência' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 200, description: 'Lista de decisões registradas em ordem cronológica' })
  @ApiResponse({ status: 404, description: 'Ocorrência não encontrada' })
  listar(@Param('ocorrenciaId') id: string) {
    return this.service.listarPorOcorrencia(id);
  }
}
