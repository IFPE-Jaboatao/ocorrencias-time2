import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { DashboardService }  from './dashboard.service';
import { CurrentUser }       from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Dashboard')
@ApiBearerAuth('jwt')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de ocorrências por status, escopo do usuário (RF-09)' })
  @ApiResponse({
    status: 200,
    description: 'Contagens de ocorrências: total, abertas, aguardando validação, em acompanhamento, resolvidas hoje, SLA vencidas e distribuição por severidade',
    schema: {
      example: {
        total: 42, abertas: 10, aguardandoValidacao: 5,
        emAcompanhamento: 15, resolvidasHoje: 3, slaVencidas: 2,
        porSeveridade: { '1': 5, '2': 12, '3': 18, '4': 5, '5': 2 },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Token inválido ou expirado' })
  resumo(@CurrentUser() user: AuthenticatedUser) {
    return this.service.resumo(user);
  }

  @Get('por-severidade')
  @ApiOperation({ summary: 'Distribuição de ocorrências abertas por severidade' })
  @ApiResponse({
    status: 200,
    description: 'Mapa de severidade (1–5) para contagem de ocorrências abertas no escopo do usuário',
    schema: { example: { '1': 5, '2': 12, '3': 8, '4': 3, '5': 1 } },
  })
  @ApiResponse({ status: 403, description: 'Token inválido ou expirado' })
  porSeveridade(@CurrentUser() user: AuthenticatedUser) {
    return this.service.porSeveridade(user);
  }
}
