import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ResponsaveisService }  from './responsaveis.service';
import { CreateResponsavelDto } from './dto/create-responsavel.dto';
import { Roles }                from '../../common/decorators/roles.decorator';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';

@ApiTags('Responsáveis')
@ApiBearerAuth('jwt')
@Controller('responsaveis')
export class ResponsaveisController {
  constructor(private readonly service: ResponsaveisService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Vincular responsável legal a aluno' })
  @ApiResponse({ status: 201, description: 'Responsável vinculado com sucesso' })
  @ApiResponse({ status: 400, description: 'DTO inválido ou alunoId não existe' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN, SECRETARIA ou COORDENADOR' })
  criar(@Body() dto: CreateResponsavelDto) {
    return this.service.criar(dto);
  }

  @Get('aluno/:alunoId')
  @ApiOperation({ summary: 'Listar responsáveis de um aluno' })
  @ApiParam({ name: 'alunoId', description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Lista de responsáveis legais do aluno' })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  listarPorAluno(@Param('alunoId') alunoId: string) {
    return this.service.listarPorAluno(alunoId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar responsável por ID' })
  @ApiParam({ name: 'id', description: 'UUID do responsável' })
  @ApiResponse({ status: 200, description: 'Dados do responsável' })
  @ApiResponse({ status: 404, description: 'Responsável não encontrado' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
