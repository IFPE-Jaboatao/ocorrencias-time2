import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponsaveisService }   from './responsaveis.service';
import { CreateResponsavelDto }  from './dto/create-responsavel.dto';
import { Roles }                 from '../../common/decorators/roles.decorator';
import { PerfilUsuario }         from '../../common/enums/perfil-usuario.enum';

@ApiTags('Responsáveis')
@ApiBearerAuth('jwt')
@Controller('responsaveis')
export class ResponsaveisController {
  constructor(private readonly service: ResponsaveisService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Vincular responsável legal a aluno' })
  criar(@Body() dto: CreateResponsavelDto) {
    return this.service.criar(dto);
  }

  @Get('aluno/:alunoId')
  @ApiOperation({ summary: 'Listar responsáveis de um aluno' })
  listarPorAluno(@Param('alunoId') alunoId: string) {
    return this.service.listarPorAluno(alunoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar responsável por ID' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
