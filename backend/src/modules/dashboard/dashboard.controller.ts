import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService }  from './dashboard.service';
import { CurrentUser }       from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Dashboard')
@ApiBearerAuth('jwt')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('resumo')
  @ApiOperation({ summary: 'Resumo de ocorrências por status (RF-09)' })
  resumo(@CurrentUser() user: AuthenticatedUser) {
    return this.service.resumo(user);
  }

  @Get('por-severidade')
  @ApiOperation({ summary: 'Distribuição por severidade' })
  porSeveridade(@CurrentUser() user: AuthenticatedUser) {
    return this.service.porSeveridade(user);
  }
}
