import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { UsuariosService }    from './usuarios.service';
import { CreateUsuarioDto }   from './dto/create-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { Roles }              from '../../common/decorators/roles.decorator';
import { Serialize }          from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }      from '../../common/enums/perfil-usuario.enum';

@ApiTags('Usuários')
@ApiBearerAuth('jwt')
@Serialize(UsuarioResponseDto)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar usuário no sistema (RF-14)' })
  @ApiResponse({ status: 201, description: 'Usuário criado', type: UsuarioResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  criar(@Body() dto: CreateUsuarioDto) {
    return this.service.criar(dto);
  }

  @Get()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Listar todos os usuários ativos (RF-14)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários com ativo = true', type: [UsuarioResponseDto] })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou DIRETOR' })
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Dados do usuário', type: UsuarioResponseDto })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou DIRETOR' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id/perfil')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Alterar perfil/campus do usuário (RF-14)' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Perfil atualizado', type: UsuarioResponseDto })
  @ApiResponse({ status: 400, description: 'Perfil inválido' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  alterarPerfil(@Param('id') id: string, @Body('perfil') perfil: PerfilUsuario) {
    return this.service.alterarPerfil(id, perfil);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Desativar usuário — soft delete (RF-14)' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário desativado (ativo = false)' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  desativar(@Param('id') id: string) {
    return this.service.desativar(id);
  }
}
