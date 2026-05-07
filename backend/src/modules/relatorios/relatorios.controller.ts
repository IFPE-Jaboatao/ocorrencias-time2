import { Controller, Get, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiProduces,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Response }           from 'express';
import { RelatoriosService }  from './relatorios.service';
import { FiltroRelatorioDto } from './dto/filtro-relatorio.dto';
import { Roles }              from '../../common/decorators/roles.decorator';
import { PerfilUsuario }      from '../../common/enums/perfil-usuario.enum';

@ApiTags('Relatórios')
@ApiBearerAuth('jwt')
@Roles(
  PerfilUsuario.COORDENADOR, PerfilUsuario.EQUIPE_PEDAGOGICA,
  PerfilUsuario.DIRETOR, PerfilUsuario.SECRETARIA, PerfilUsuario.ADMIN,
)
@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly service: RelatoriosService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo estatístico das ocorrências com filtros (RF-11)' })
  @ApiResponse({
    status: 200,
    description: 'Totais por status, severidade, segmento e categoria; SLA vencidas e período analisado',
    schema: {
      example: {
        totalOcorrencias: 120,
        porStatus: { ABERTA: 20, RESOLVIDA: 80 },
        porSeveridade: { '2': 50, '3': 40 },
        porSegmento: { FUNDAMENTAL: 60, MEDIO: 40, SUPERIOR: 20 },
        porCategoria: [{ nome: 'Disciplinar', total: 70 }],
        slaVencidas: 5,
        periodo: { inicio: '2026-01-01', fim: '2026-04-30' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Perfil sem acesso a relatórios' })
  resumo(@Query() filtros: FiltroRelatorioDto) {
    return this.service.resumo(filtros);
  }

  @Get('exportar')
  @ApiOperation({ summary: 'Exportar ocorrências em CSV — dados de menores são pseudonimizados (RN-10, RF-11)' })
  @ApiProduces('text/csv')
  @ApiResponse({
    status: 200,
    description: 'Arquivo CSV com BOM UTF-8 para compatibilidade com Excel. Nome do aluno menor sem ciência formal confirmada é substituído por "Aluno XXXXXXXX" (LGPD art. 13)',
    headers: { 'Content-Disposition': { description: 'attachment; filename="radar-academico-ocorrencias-YYYY-MM-DD.csv"' } },
  })
  @ApiResponse({ status: 403, description: 'Perfil sem acesso a relatórios' })
  async exportar(@Query() filtros: FiltroRelatorioDto, @Res() res: Response) {
    const csv      = await this.service.exportarCsv(filtros);
    const filename = `radar-academico-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM para Excel reconhecer UTF-8
  }
}
