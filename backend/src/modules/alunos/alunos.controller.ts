import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { AlunosService }    from './alunos.service';
import { CreateAlunoDto }   from './dto/create-aluno.dto';
import { AlunoResponseDto } from './dto/aluno-response.dto';
import { Roles }            from '../../common/decorators/roles.decorator';
import { CurrentUser }      from '../../common/decorators/current-user.decorator';
import { Serialize }        from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Alunos')
@ApiBearerAuth('jwt')
@Serialize(AlunoResponseDto)
@Controller('alunos')
export class AlunosController {
  constructor(private readonly service: AlunosService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @ApiOperation({ summary: 'Cadastrar aluno no sistema' })
  @ApiResponse({ status: 201, description: 'Aluno criado com sucesso', type: AlunoResponseDto })
  @ApiResponse({ status: 400, description: 'DTO inválido (campo obrigatório faltando ou matrícula duplicada)' })
  @ApiResponse({ status: 403, description: 'Requer perfil ADMIN ou SECRETARIA' })
  criar(@Body() dto: CreateAlunoDto) {
    return this.service.criar(dto);
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar aluno por matrícula ou nome — com escopo por campus (RF-02)' })
  @ApiQuery({ name: 'q', required: true, description: 'Trecho da matrícula ou nome do aluno' })
  @ApiResponse({ status: 200, description: 'Lista de alunos filtrada pelo escopo do usuário', type: [AlunoResponseDto] })
  @ApiResponse({ status: 400, description: 'Parâmetro "q" ausente' })
  buscar(@Query('q') q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.buscar(q, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar aluno por ID' })
  @ApiParam({ name: 'id', description: 'UUID do aluno' })
  @ApiResponse({ status: 200, description: 'Dados do aluno', type: AlunoResponseDto })
  @ApiResponse({ status: 404, description: 'Aluno não encontrado' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
