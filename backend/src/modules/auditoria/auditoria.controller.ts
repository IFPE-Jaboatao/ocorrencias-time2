import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { InjectRepository }  from '@nestjs/typeorm';
import { Repository }        from 'typeorm';
import { Auditoria }         from './entities/auditoria.entity';
import { Roles }             from '../../common/decorators/roles.decorator';
import { PerfilUsuario }     from '../../common/enums/perfil-usuario.enum';

@ApiTags('Auditoria')
@ApiBearerAuth('jwt')
@Roles(PerfilUsuario.DIRETOR, PerfilUsuario.ADMIN)
@Controller('auditoria')
export class AuditoriaController {
  constructor(
    @InjectRepository(Auditoria)
    private readonly repo: Repository<Auditoria>,
  ) {}

  @Get('ocorrencias/:ocorrenciaId')
  @ApiOperation({ summary: 'Trilha de auditoria de uma ocorrência (RF-10) — somente DIRETOR e ADMIN' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiResponse({
    status: 200,
    description: 'Eventos em ordem cronológica: criação, mudanças de status, validações, encaminhamentos. Inclui ator, IP e timestamp.',
  })
  @ApiResponse({ status: 403, description: 'Requer perfil DIRETOR ou ADMIN' })
  listarPorOcorrencia(@Param('ocorrenciaId') ocorrenciaId: string) {
    return this.repo.find({
      where:  { ocorrenciaId },
      order:  { timestamp: 'ASC' },
    });
  }

  @Get('usuarios/:usuarioId')
  @ApiOperation({ summary: 'Ações realizadas por um usuário — rastreabilidade de ator (RF-10)' })
  @ApiParam({ name: 'usuarioId', description: 'UUID do usuário (atorId)' })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo de registros (padrão: 100)', example: 100 })
  @ApiResponse({
    status: 200,
    description: 'Ações do usuário em ordem cronológica decrescente. Cada item contém ação, entidade, valorAnterior, valorNovo e IP.',
  })
  @ApiResponse({ status: 403, description: 'Requer perfil DIRETOR ou ADMIN' })
  listarPorUsuario(
    @Param('usuarioId') atorId: string,
    @Query('limite') limite = 100,
  ) {
    return this.repo.find({
      where:  { atorId },
      order:  { timestamp: 'DESC' },
      take:   Number(limite),
    });
  }

  @Get('recentes')
  @ApiOperation({ summary: 'Últimos eventos de auditoria do sistema — visão global (RF-10)' })
  @ApiQuery({ name: 'limite', required: false, description: 'Máximo de registros (padrão: 50, máx: 200)', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Eventos mais recentes de qualquer entidade, em ordem decrescente de timestamp.',
  })
  @ApiResponse({ status: 403, description: 'Requer perfil DIRETOR ou ADMIN' })
  listarRecentes(@Query('limite') limite = 50) {
    return this.repo.find({
      order: { timestamp: 'DESC' },
      take:  Math.min(Number(limite), 200),
    });
  }
}
