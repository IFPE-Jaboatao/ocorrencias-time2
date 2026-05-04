import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AlunosService }   from './alunos.service';
import { CreateAlunoDto }  from './dto/create-aluno.dto';
import { AlunoResponseDto } from './dto/aluno-response.dto';
import { Roles }           from '../../common/decorators/roles.decorator';
import { CurrentUser }     from '../../common/decorators/current-user.decorator';
import { Serialize }       from '../../common/interceptors/serialize.interceptor';
import { PerfilUsuario }   from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Alunos')
@ApiBearerAuth('jwt')
@Serialize(AlunoResponseDto)
@Controller('alunos')
export class AlunosController {
  constructor(private readonly service: AlunosService) {}

  @Post()
  @Roles(PerfilUsuario.ADMIN, PerfilUsuario.SECRETARIA)
  @ApiOperation({ summary: 'Cadastrar aluno' })
  criar(@Body() dto: CreateAlunoDto) {
    return this.service.criar(dto);
  }

  @Get('buscar')
  @ApiOperation({ summary: 'Buscar aluno por matrícula ou nome (RF-02)' })
  @ApiQuery({ name: 'q', description: 'Matrícula ou nome' })
  buscar(@Query('q') q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.buscar(q, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar aluno por ID' })
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }
}
