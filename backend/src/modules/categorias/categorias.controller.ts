import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags }        from '@nestjs/swagger';
import { CategoriasService }  from './categorias.service';
import { CreateCategoriaDto } from './dto/create-categoria.dto';
import { Roles }              from '../../common/decorators/roles.decorator';
import { PerfilUsuario }      from '../../common/enums/perfil-usuario.enum';

@ApiTags('Categorias')
@ApiBearerAuth('jwt')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar categoria de ocorrência' })
  criar(@Body() dto: CreateCategoriaDto) {
    return this.service.criar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias ativas' })
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Desativar categoria (RF-15)' })
  desativar(@Param('id') id: string) {
    return this.service.desativar(id);
  }
}
