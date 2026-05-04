import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Validar/devolver/escalar ocorrência (RF-04)' })
  validar(
    @Param('ocorrenciaId') id: string,
    @Body() dto: ValidarOcorrenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.validar(id, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Histórico de validações da ocorrência' })
  listar(@Param('ocorrenciaId') id: string) {
    return this.service.listarPorOcorrencia(id);
  }
}
