import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { ResponsaveisService }    from './responsaveis.service';
import { CreateResponsavelDto }   from './dto/create-responsavel.dto';
import { VincularResponsavelDto } from './dto/vincular-responsavel.dto';
import { UpdateResponsavelDto }   from './dto/update-responsavel.dto';
import { UpdateVinculoDto }       from './dto/update-vinculo.dto';
import { Roles }                  from '../../common/decorators/roles.decorator';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';

@ApiTags('Responsáveis')
@ApiBearerAuth('jwt')
@Controller('responsaveis')
export class ResponsaveisController {
  constructor(private readonly service: ResponsaveisService) {}

  /**
   * POST /responsaveis
   * Cria um responsável (ou reutiliza um existente pelo e-mail) e o vincula ao aluno.
   * Seguro para o cenário de irmãos: a segunda chamada com o mesmo e-mail
   * apenas cria o vínculo adicional, sem duplicar a pessoa.
   */
  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Criar responsável e vincular a um aluno (idempotente por e-mail)' })
  @ApiResponse({ status: 201, description: 'Responsável criado/encontrado e vinculado ao aluno' })
  @ApiResponse({ status: 409, description: 'Responsável já vinculado a este aluno' })
  criarOuVincular(@Body() dto: CreateResponsavelDto) {
    return this.service.criarOuVincular(dto);
  }

  /**
   * POST /responsaveis/:id/vincular
   * Vincula um Responsavel JÁ EXISTENTE a um aluno adicional.
   * Útil quando a secretaria sabe o UUID do responsável e só precisa criar o vínculo.
   */
  @Post(':id/vincular')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Vincular responsável existente a outro aluno' })
  @ApiParam({ name: 'id', description: 'UUID do responsável já cadastrado' })
  @ApiResponse({ status: 201, description: 'Vínculo criado com sucesso' })
  @ApiResponse({ status: 404, description: 'Responsável não encontrado' })
  @ApiResponse({ status: 409, description: 'Responsável já vinculado a este aluno' })
  vincularExistente(
    @Param('id') id: string,
    @Body() dto: VincularResponsavelDto,
  ) {
    return this.service.vincularExistente(id, dto);
  }

  /**
   * GET /responsaveis/aluno/:alunoId
   * Lista todos os vínculos de um aluno com dados da pessoa (responsavel + vínculo).
   */
  @Get('aluno/:alunoId')
  @ApiOperation({ summary: 'Listar responsáveis de um aluno (com dados do vínculo)' })
  @ApiParam({ name: 'alunoId', description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Lista de vínculos (responsavel + parentesco + preferências)' })
  listarPorAluno(@Param('alunoId') alunoId: string) {
    return this.service.listarPorAluno(alunoId);
  }

  /**
   * GET /responsaveis/:id
   * Retorna os dados pessoais do responsável (sem vínculos).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Buscar responsável por ID' })
  @ApiParam({ name: 'id', description: 'UUID do responsável' })
  @ApiResponse({ status: 200, description: 'Dados pessoais do responsável' })
  @ApiResponse({ status: 404, description: 'Responsável não encontrado' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  /**
   * PATCH /responsaveis/:id
   * Atualiza dados pessoais (nome, e-mail, telefone).
   * Como o responsável é único no banco, a mudança reflete em todos os seus vínculos.
   */
  @Patch(':id')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Atualizar dados pessoais do responsável' })
  @ApiParam({ name: 'id', description: 'UUID do responsável' })
  @ApiResponse({ status: 200, description: 'Responsável atualizado' })
  @ApiResponse({ status: 404, description: 'Responsável não encontrado' })
  atualizarPessoal(@Param('id') id: string, @Body() dto: UpdateResponsavelDto) {
    return this.service.atualizarPessoal(id, dto);
  }

  /**
   * PATCH /responsaveis/:responsavelId/vinculos/:alunoId
   * Atualiza apenas o vínculo (parentesco, receberNotificacoes) sem alterar a pessoa.
   */
  @Patch(':responsavelId/vinculos/:alunoId')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA, PerfilUsuario.COORDENADOR)
  @ApiOperation({ summary: 'Atualizar vínculo (parentesco, receberNotificacoes)' })
  @ApiParam({ name: 'responsavelId', description: 'UUID do responsável' })
  @ApiParam({ name: 'alunoId',       description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Vínculo atualizado' })
  @ApiResponse({ status: 404, description: 'Vínculo não encontrado' })
  atualizarVinculo(
    @Param('responsavelId') responsavelId: string,
    @Param('alunoId')       alunoId: string,
    @Body() dto: UpdateVinculoDto,
  ) {
    return this.service.atualizarVinculo(responsavelId, alunoId, dto);
  }

  /**
   * DELETE /responsaveis/:responsavelId/vinculos/:alunoId
   * Remove o vínculo com o aluno.
   * O Responsavel (pessoa) NÃO é excluído — pode ter outros filhos na escola.
   */
  @Delete(':responsavelId/vinculos/:alunoId')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @ApiOperation({ summary: 'Remover vínculo entre responsável e aluno' })
  @ApiParam({ name: 'responsavelId', description: 'UUID do responsável' })
  @ApiParam({ name: 'alunoId',       description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Vínculo removido' })
  @ApiResponse({ status: 404, description: 'Vínculo não encontrado' })
  removerVinculo(
    @Param('responsavelId') responsavelId: string,
    @Param('alunoId')       alunoId: string,
  ) {
    return this.service.removerVinculo(responsavelId, alunoId);
  }
}
