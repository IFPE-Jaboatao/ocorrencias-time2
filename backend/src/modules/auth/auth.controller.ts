import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags }           from '@nestjs/swagger';
import { Throttle }                                     from '@nestjs/throttler';
import { AuthService }                                  from './auth.service';
import { SolicitarMagicLinkDto }                        from './dto/solicitar-magic-link.dto';
import { VerificarMagicLinkDto }                        from './dto/verificar-magic-link.dto';
import { RefreshTokenDto }                              from './dto/refresh-token.dto';
import { Public }                                       from '../../common/decorators/public.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Solicitar magic link por e-mail' })
  @ApiResponse({ status: 200, description: 'E-mail enviado (ou silenciado se não existe)' })
  async solicitarMagicLink(@Body() dto: SolicitarMagicLinkDto) {
    const token = await this.authService.solicitarMagicLink(dto.email);
    // Em produção o token é enviado por e-mail; em dev retornamos no body
    if (process.env.NODE_ENV !== 'production') return { token };
    return { message: 'Se o e-mail existir, você receberá o link em breve.' };
  }

  @Public()
  @Post('magic-link/verificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar token do magic link e obter JWT' })
  @ApiResponse({ status: 200, description: 'accessToken + refreshToken emitidos' })
  async verificarMagicLink(@Body() dto: VerificarMagicLinkDto) {
    return this.authService.verificarMagicLink(dto.token);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token via refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revogar refresh token (logout)' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.revogarRefreshToken(dto.refreshToken);
  }
}
