import {
  Body, Controller, Get, Param, Patch, Post, Query,
  Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation,
  ApiParam, ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { AlunosService }    from './alunos.service';
import { CreateAlunoDto }   from './dto/create-aluno.dto';
import { UpdateAlunoDto }   from './dto/update-aluno.dto';
import { FilterAlunoDto }   from './dto/filter-aluno.dto';
import { AlunoResponseDto } from './dto/aluno-response.dto';
import { Roles }            from '../../common/decorators/roles.decorator';
import { CurrentUser }      from '../../common/decorators/current-user.decorator';
import { Serialize }        from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Alunos')
@ApiBearerAuth('jwt')
@Controller('alunos')
export class AlunosController {
  constructor(private readonly service: AlunosService) {}

  /** POST /alunos — Cadastro individual */
  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @Serialize(AlunoResponseDto)
  @ApiOperation({ summary: 'Cadastrar aluno no sistema' })
  @ApiResponse({ status: 201, description: 'Aluno criado com sucesso', type: AlunoResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido (campo obrigatório faltando ou matrícula duplicada)' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou SECRETARIA' })
  criar(@Body() dto: CreateAlunoDto) {
    return this.service.criar(dto);
  }

  /** GET /alunos — Listagem paginada com filtros */
  @Get()
  @Serialize(AlunoResponseDto)
  @ApiOperation({ summary: 'Listar alunos com paginação e filtros' })
  @ApiResponse({ status: 200, description: 'Lista paginada de alunos' })
  listar(@Query() filtros: FilterAlunoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listar(filtros, user);
  }

  /** GET /alunos/template — Download do modelo Excel */
  @Get('template')
  @ApiOperation({ summary: 'Baixar template Excel para importação de alunos em lote' })
  @ApiResponse({ status: 200, description: 'Arquivo .xlsx com colunas e exemplo' })
  baixarTemplate(@Res() res: Response) {
    const buffer = this.service.gerarTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="template_alunos.xlsx"');
    res.send(buffer);
  }

  /** GET /alunos/buscar — Autocomplete por matrícula/nome */
  @Get('buscar')
  @Serialize(AlunoResponseDto)
  @ApiOperation({ summary: 'Buscar aluno por matrícula ou nome — com escopo por campus (RF-02)' })
  @ApiQuery({ name: 'q', required: false, description: 'Trecho da matrícula ou nome do aluno' })
  @ApiResponse({ status: 200, description: 'Lista de alunos filtrada pelo escopo do usuário', type: [AlunoResponseDto] })
  buscar(@Query('q') q = '', @CurrentUser() user: AuthenticatedUser) {
    return this.service.buscar(q, user);
  }

  /** POST /alunos/importar — Importação em lote via Excel */
  @Post('importar')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({ summary: 'Importar alunos em lote via arquivo Excel (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { arquivo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Resultado da importação: importados, ignorados, erros' })
  @ApiResponse({ status: 400, description: 'Arquivo inválido ou planilha vazia' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou SECRETARIA' })
  importar(@UploadedFile() arquivo: Express.Multer.File) {
    if (!arquivo) {
      throw new Error('Arquivo não enviado');
    }
    return this.service.importarLote(arquivo.buffer);
  }

  /** PATCH /alunos/:id — Atualização parcial */
  @Patch(':id')
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @Serialize(AlunoResponseDto)
  @ApiOperation({ summary: 'Atualizar dados do aluno' })
  @ApiParam({ name: 'id', description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Aluno atualizado', type: AlunoResponseDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou SECRETARIA' })
  atualizar(@Param('id') id: string, @Body() dto: UpdateAlunoDto) {
    return this.service.atualizar(id, dto);
  }

  /** GET /alunos/:id — Busca por ID */
  @Get(':id')
  @Serialize(AlunoResponseDto)
  @ApiOperation({ summary: 'Buscar aluno por ID' })
  @ApiParam({ name: 'id', description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Dados do aluno', type: AlunoResponseDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
