import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags }       from '@nestjs/swagger';
import { EncaminhamentosService }   from './encaminhamentos.service';
import { CreateEncaminhamentoDto }  from './dto/create-encaminhamento.dto';
import { Roles }                    from '../../common/decorators/roles.decorator';
import { PerfilUsuario }            from '../../common/enums/perfil-usuario.enum';

@ApiTags('Encaminhamentos')
@ApiBearerAuth('jwt')
@Controller('ocorrencias/:ocorrenciaId/encaminhamentos')
export class EncaminhamentosController {
  constructor(private readonly service: EncaminhamentosService) {}

  @Post()
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar encaminhamento (RF-05)' })
  criar(@Param('ocorrenciaId') ocorrenciaId: string, @Body() dto: CreateEncaminhamentoDto) {
    return this.service.criar(ocorrenciaId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar encaminhamentos da ocorrência' })
  listar(@Param('ocorrenciaId') ocorrenciaId: string) {
    return this.service.listarPorOcorrencia(ocorrenciaId);
  }

  @Patch(':id/resultado')
  @Roles(PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA, PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Registrar resultado do encaminhamento' })
  registrarResultado(@Param('id') id: string, @Body('resultado') resultado: string) {
    return this.service.registrarResultado(id, resultado);
  }
}
