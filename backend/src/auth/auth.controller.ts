import {
  Controller, Post, Get, Body, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestMagicLinkDto } from './dto/request-magic-link.dto';
import { VerifyMagicLinkDto } from './dto/verify-magic-link.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * US-02: Solicitar magic link por e-mail.
   * Rate limit: 3 tentativas por e-mail por minuto (via ThrottlerModule global).
   */
  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Solicitar link de acesso por e-mail' })
  @ApiResponse({ status: 200, description: 'E-mail enviado (se cadastrado).' })
  async requestMagicLink(@Body() dto: RequestMagicLinkDto): Promise<{ message: string }> {
    await this.authService.requestMagicLink(dto.email);
    // Resposta genérica — não revela se o e-mail está cadastrado
    return { message: 'Se o e-mail estiver cadastrado, você receberá o link em breve.' };
  }

  /**
   * US-03: Verificar token e obter par de JWTs.
   */
  @Public()
  @Get('verify')
  @ApiOperation({ summary: 'Verificar token do magic link e autenticar' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Token inválido, expirado ou já utilizado.' })
  async verifyMagicLink(@Query() dto: VerifyMagicLinkDto): Promise<AuthResponseDto> {
    return this.authService.verifyMagicLink(dto.token);
  }

  /**
   * US-03: Renovar access token com refresh token.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() dto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  /**
   * US-03: Logout — revoga o refresh token.
   */
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout — revoga o refresh token' })
  @ApiResponse({ status: 204, description: 'Logout realizado.' })
  async logout(
    @Body() dto: RefreshTokenDto,
    @CurrentUser() _user: User,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  /** Health check público */
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health(): { status: string } {
    return { status: 'ok' };
  }
}
