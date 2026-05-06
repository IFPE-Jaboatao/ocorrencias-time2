import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response }               from 'express';
import { RelatoriosService }      from './relatorios.service';
import { FiltroRelatorioDto }     from './dto/filtro-relatorio.dto';
import { Roles }                  from '../../common/decorators/roles.decorator';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';

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
  @ApiOperation({ summary: 'Resumo estatístico das ocorrências (RF-11)' })
  resumo(@Query() filtros: FiltroRelatorioDto) {
    return this.service.resumo(filtros);
  }

  @Get('exportar')
  @ApiOperation({ summary: 'Exportar ocorrências em CSV (RF-11)' })
  async exportar(@Query() filtros: FiltroRelatorioDto, @Res() res: Response) {
    const csv      = await this.service.exportarCsv(filtros);
    const filename = `radar-academico-ocorrencias-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('﻿' + csv); // BOM para Excel reconhecer UTF-8
  }
}
