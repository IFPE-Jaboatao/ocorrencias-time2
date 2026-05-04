import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Criar usuário' })
  @ApiResponse({ status: 201, type: UsuarioResponseDto })
  criar(@Body() dto: CreateUsuarioDto) {
    return this.service.criar(dto);
  }

  @Get()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Listar usuários ativos' })
  @ApiResponse({ status: 200, type: [UsuarioResponseDto] })
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.DIRETOR)
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id/perfil')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Alterar perfil do usuário' })
  alterarPerfil(@Param('id') id: string, @Body('perfil') perfil: PerfilUsuario) {
    return this.service.alterarPerfil(id, perfil);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Desativar usuário' })
  desativar(@Param('id') id: string) {
    return this.service.desativar(id);
  }
}
