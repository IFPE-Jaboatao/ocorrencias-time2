import { Body, Controller, ForbiddenException, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Throttle }                from '@nestjs/throttler';
import { AuthService }             from './auth.service';
import { SolicitarMagicLinkDto }   from './dto/solicitar-magic-link.dto';
import { VerificarMagicLinkDto }   from './dto/verificar-magic-link.dto';
import { RefreshTokenDto }         from './dto/refresh-token.dto';
import { Public }                  from '../../common/decorators/public.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Solicitar magic link — envia e-mail com link de acesso' })
  @ApiResponse({ status: 200, description: 'E-mail enviado (resposta é idêntica mesmo se o e-mail não existir — evita enumeração de usuários)' })
  @ApiResponse({ status: 400, description: 'E-mail inválido ou ausente' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido — máximo 3 tentativas por minuto por IP' })
  async solicitarMagicLink(@Body() dto: SolicitarMagicLinkDto) {
    const token = await this.authService.solicitarMagicLink(dto.email);
    // Em produção o token é enviado por e-mail; em dev retornamos no body
    if (process.env.NODE_ENV !== 'production') return { token };
    return { message: 'Se o e-mail existir, você receberá o link em breve.' };
  }

  @Public()
  @Post('magic-link/verificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar token do magic link e obter JWT de acesso' })
  @ApiResponse({
    status: 200,
    description: 'accessToken (8h) + refreshToken (7d) emitidos',
    schema: { example: { accessToken: 'eyJ...', refreshToken: 'eyJ...' } },
  })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou já utilizado' })
  async verificarMagicLink(@Body() dto: VerificarMagicLinkDto) {
    return this.authService.verificarMagicLink(dto.token);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando refresh token válido' })
  @ApiResponse({
    status: 200,
    description: 'Novo accessToken emitido',
    schema: { example: { accessToken: 'eyJ...' } },
  })
  @ApiResponse({ status: 401, description: 'Refresh token inválido, expirado ou revogado' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar refresh token — invalida a sessão atual' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada. O refreshToken não pode mais ser usado.' })
  @ApiResponse({ status: 401, description: 'Token de acesso inválido ou expirado' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revogarRefreshToken(dto.refreshToken);
  }

  @Public()
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV ONLY] Login direto sem magic link — bloqueado em produção' })
  @ApiResponse({ status: 200, description: 'accessToken + refreshToken (apenas com DEV_LOGIN_ENABLED=true)' })
  @ApiResponse({ status: 403, description: 'Endpoint desabilitado em produção' })
  async devLogin(@Body() dto: SolicitarMagicLinkDto) {
    if (process.env.DEV_LOGIN_ENABLED !== 'true') {
      throw new ForbiddenException('Endpoint disponível apenas em desenvolvimento');
    }
    return this.authService.devLogin(dto.email);
  }
}
