import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { CategoriasService }      from './categorias.service';
import { CreateCategoriaDto }     from './dto/create-categoria.dto';
import { CreateSubcategoriaDto }  from './dto/create-subcategoria.dto';
import { Roles }                  from '../../common/decorators/roles.decorator';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';

@ApiTags('Categorias')
@ApiBearerAuth('jwt')
@Controller('categorias')
export class CategoriasController {
  constructor(private readonly service: CategoriasService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar categoria de ocorrência (RF-15)' })
  @ApiResponse({ status: 201, description: 'Categoria criada com sucesso' })
  @ApiResponse({ status: 400, description: 'DTO inválido' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  criar(@Body() dto: CreateCategoriaDto) {
    return this.service.criar(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar categorias ativas com subcategorias' })
  @ApiResponse({ status: 200, description: 'Lista de categorias com ativo = true' })
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar categoria por ID' })
  @ApiParam({ name: 'id', description: 'UUID da categoria' })
  @ApiResponse({ status: 200, description: 'Dados da categoria' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @Delete(':id')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Desativar categoria (soft delete — RF-15)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria a desativar' })
  @ApiResponse({ status: 200, description: 'Categoria desativada' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  desativar(@Param('id') id: string) {
    return this.service.desativar(id);
  }

  @Post(':id/subcategorias')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Criar subcategoria dentro de uma categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria pai' })
  @ApiResponse({ status: 201, description: 'Subcategoria criada' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  criarSubcategoria(@Param('id') id: string, @Body() dto: CreateSubcategoriaDto) {
    return this.service.criarSubcategoria(id, dto);
  }

  @Get(':id/subcategorias')
  @ApiOperation({ summary: 'Listar subcategorias ativas de uma categoria' })
  @ApiParam({ name: 'id', description: 'UUID da categoria pai' })
  @ApiResponse({ status: 200, description: 'Lista de subcategorias ativas' })
  @ApiResponse({ status: 404, description: 'Categoria não encontrada' })
  listarSubcategorias(@Param('id') id: string) {
    return this.service.listarSubcategorias(id);
  }

  @Delete(':id/subcategorias/:subcategoriaId')
  @Roles(PerfilUsuario.ADMIN)
  @ApiOperation({ summary: 'Desativar subcategoria (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID da categoria pai' })
  @ApiParam({ name: 'subcategoriaId', description: 'UUID da subcategoria' })
  @ApiResponse({ status: 200, description: 'Subcategoria desativada' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN' })
  @ApiResponse({ status: 404, description: 'Subcategoria não encontrada' })
  desativarSubcategoria(@Param('id') id: string, @Param('subcategoriaId') subcategoriaId: string) {
    return this.service.desativarSubcategoria(id, subcategoriaId);
  }
}
