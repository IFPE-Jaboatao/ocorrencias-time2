import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags }                    from '@nestjs/swagger';
import { Request }                                  from 'express';
import { CienciaFormalService }                     from './ciencia-formal.service';
import { Public }                                   from '../../common/decorators/public.decorator';

@ApiTags('Ciência Formal')
@Controller('ciencia-formal')
export class CienciaFormalController {
  constructor(private readonly service: CienciaFormalService) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Exibir dados da ocorrência para ciência (página pública RF-12)' })
  visualizar(@Param('token') token: string) {
    return this.service.buscarPorToken(token);
  }

  @Public()
  @Post(':token/confirmar')
  @ApiOperation({ summary: 'Confirmar ciência formal (consome o token)' })
  confirmar(@Param('token') token: string, @Req() req: Request) {
    const ip        = (req.headers['x-forwarded-for'] as string) ?? req.ip ?? '0.0.0.0';
    const userAgent = req.headers['user-agent'] ?? '';
    return this.service.confirmar(token, ip, userAgent);
  }
}
