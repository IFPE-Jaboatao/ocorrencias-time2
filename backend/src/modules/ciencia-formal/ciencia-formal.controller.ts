import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  ApiOperation, ApiParam, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Request }              from 'express';
import { CienciaFormalService } from './ciencia-formal.service';
import { Public }               from '../../common/decorators/public.decorator';

@ApiTags('Ciência Formal')
@Controller('ciencia-formal')
export class CienciaFormalController {
  constructor(private readonly service: CienciaFormalService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Buscar dados da ocorrência pelo token de ciência formal (página pública — RF-12)' })
  @ApiParam({ name: 'token', description: 'Token de 64 chars hexadecimais enviado por e-mail ao responsável/aluno' })
  @ApiResponse({ status: 200, description: 'Dados da ciência formal com ocorrência vinculada' })
  @ApiResponse({ status: 404, description: 'Token inválido ou expirado' })
  visualizar(@Param('token') token: string) {
    return this.service.buscarPorToken(token);
  }

  @Public()
  @Post(':token/confirmar')
  @ApiOperation({ summary: 'Confirmar ciência formal — consome o token (uso único) e registra IP + user-agent (RF-12, H-07)' })
  @ApiParam({ name: 'token', description: 'Token de 64 chars hexadecimais' })
  @ApiResponse({ status: 201, description: 'Ciência confirmada. dataConfirmacao preenchida, token invalidado.' })
  @ApiResponse({ status: 400, description: 'Token já utilizado (H-07) ou expirado (> 5 dias úteis)' })
  @ApiResponse({ status: 404, description: 'Token inválido' })
  confirmar(@Param('token') token: string, @Req() req: Request) {
    const ip        = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.service.confirmar(token, ip, userAgent);
  }
}
