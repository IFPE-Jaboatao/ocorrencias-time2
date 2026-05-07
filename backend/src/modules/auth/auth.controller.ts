import {
  Body, Controller, ForbiddenException, Get, HttpCode,
  HttpStatus, Post, Res, UseGuards,
} from '@nestjs/common';
import { Response, Request }       from 'express';
import {
  ApiCookieAuth, ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Throttle }                from '@nestjs/throttler';
import { randomBytes }             from 'crypto';
import { AuthService }             from './auth.service';
import { SolicitarMagicLinkDto }   from './dto/solicitar-magic-link.dto';
import { VerificarMagicLinkDto }   from './dto/verificar-magic-link.dto';
import { Public }                  from '../../common/decorators/public.decorator';
import { CurrentUser }             from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard }            from './guards/jwt-auth.guard';
import { AuthenticatedUser }       from '../../common/interfaces/authenticated-user.interface';

const COOKIE_OPTS_ACCESS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   8 * 60 * 60 * 1000,       // 8 horas
  path:     '/',
};

const COOKIE_OPTS_REFRESH = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 dias
  path:     '/',
};

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Magic link ────────────────────────────────────────────────────────────

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @ApiOperation({ summary: 'Solicitar magic link — envia e-mail com link de acesso' })
  @ApiResponse({ status: 200, description: 'E-mail enviado (resposta idêntica mesmo se e-mail não existir — evita enumeração)' })
  @ApiResponse({ status: 429, description: 'Rate limit excedido — máximo 3 tentativas por minuto por IP' })
  async solicitarMagicLink(@Body() dto: SolicitarMagicLinkDto) {
    const token = await this.authService.solicitarMagicLink(dto.email);
    if (process.env.NODE_ENV !== 'production') return { token };
    return { message: 'Se o e-mail existir, você receberá o link em breve.' };
  }

  @Public()
  @Post('magic-link/verificar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verificar token do magic link — autentica via cookies HttpOnly' })
  @ApiResponse({ status: 200, description: 'Autenticado. Cookies sgoa_token e sgoa_refresh setados.', schema: { example: { ok: true } } })
  @ApiResponse({ status: 400, description: 'Token inválido, expirado ou já utilizado' })
  async verificarMagicLink(
    @Body() dto: VerificarMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.verificarMagicLink(dto.token);
    res.cookie('sgoa_token',   accessToken,  COOKIE_OPTS_ACCESS);
    res.cookie('sgoa_refresh', refreshToken, COOKIE_OPTS_REFRESH);
    return { ok: true };
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token usando cookie sgoa_refresh' })
  @ApiResponse({ status: 200, description: 'Novo cookie sgoa_token setado.', schema: { example: { ok: true } } })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(@Res({ passthrough: true }) res: Response) {
    const req         = res.req as Request & { cookies: Record<string, string> };
    const rawRefresh  = req.cookies?.sgoa_refresh ?? '';
    const { accessToken, refreshToken } = await this.authService.refresh(rawRefresh);
    res.cookie('sgoa_token',   accessToken,  COOKIE_OPTS_ACCESS);
    res.cookie('sgoa_refresh', refreshToken, COOKIE_OPTS_REFRESH);
    return { ok: true };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Encerrar sessão — limpa cookies e revoga refresh token' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada.' })
  async logout(@Res({ passthrough: true }) res: Response) {
    const req        = res.req as Request & { cookies: Record<string, string> };
    const rawRefresh = req.cookies?.sgoa_refresh;
    if (rawRefresh) {
      try { await this.authService.revogarRefreshToken(rawRefresh); } catch { /* best-effort */ }
    }
    res.clearCookie('sgoa_token',   { path: '/' });
    res.clearCookie('sgoa_refresh', { path: '/' });
    res.clearCookie('csrf_token',   { path: '/' });
  }

  // ── Usuário atual ─────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Retornar dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Payload JWT do usuário autenticado' })
  @ApiResponse({ status: 401, description: 'Não autenticado' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // ── CSRF token ────────────────────────────────────────────────────────────

  @Public()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Obter CSRF token (seta cookie não-HttpOnly + retorna valor)' })
  @ApiResponse({ status: 200, schema: { example: { csrfToken: 'hex64chars' } } })
  getCsrfToken(@Res({ passthrough: true }) res: Response) {
    const csrfToken = randomBytes(32).toString('hex');
    res.cookie('csrf_token', csrfToken, {
      httpOnly: false,               // lido pelo JS do frontend
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge:   8 * 60 * 60 * 1000,
      path:     '/',
    });
    return { csrfToken };
  }

  // ── Dev login (bloqueado em produção) ─────────────────────────────────────

  @Public()
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '[DEV ONLY] Login direto sem magic link — bloqueado em produção' })
  @ApiResponse({ status: 200, description: 'Cookies setados (apenas com DEV_LOGIN_ENABLED=true)', schema: { example: { ok: true } } })
  @ApiResponse({ status: 403, description: 'Endpoint desabilitado em produção' })
  async devLogin(
    @Body() dto: SolicitarMagicLinkDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (process.env.DEV_LOGIN_ENABLED !== 'true') {
      throw new ForbiddenException('Endpoint disponível apenas em desenvolvimento');
    }
    const { accessToken, refreshToken } = await this.authService.devLogin(dto.email);
    res.cookie('sgoa_token',   accessToken,  COOKIE_OPTS_ACCESS);
    res.cookie('sgoa_refresh', refreshToken, COOKIE_OPTS_REFRESH);
    return { ok: true };
  }
}
