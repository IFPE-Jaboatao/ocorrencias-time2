import { Controller, Get, Param, Patch } from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { NotificacoesService } from './notificacoes.service';
import { CurrentUser }         from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser }   from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Notificações')
@ApiBearerAuth('jwt')
@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar notificações do usuário autenticado (RF-08) — ordenadas da mais recente, máx. 50' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificações do usuário. Inclui canal (EMAIL/IN_APP), status (PENDENTE/ENVIADO/LIDO/FALHOU) e dataEnvio.',
  })
  @ApiResponse({ status: 403, description: 'Token inválido ou expirado' })
  listar(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listarParaUsuario(user.sub);
  }

  @Patch(':id/lida')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @ApiParam({ name: 'id', description: 'UUID da notificação' })
  @ApiResponse({ status: 200, description: 'Status alterado para LIDO e dataLeitura preenchida' })
  @ApiResponse({ status: 404, description: 'Notificação não encontrada ou não pertence ao usuário' })
  marcarLida(@Param('id') id: string) {
    return this.service.marcarLida(id);
  }
}
