import {
  Controller, Post, Get, Delete,
  Body, Param, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam,
  ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { EvidenciasService }      from './evidencias.service';
import { PresignedUrlDto }        from './dto/presigned-url.dto';
import { ConfirmarUploadDto }     from './dto/confirmar-upload.dto';
import { EvidenciaResponseDto, PresignedUrlResponseDto } from './dto/evidencia-response.dto';
import { Roles }                  from '../../common/decorators/roles.decorator';
import { CurrentUser }            from '../../common/decorators/current-user.decorator';
import { PerfilUsuario }          from '../../common/enums/perfil-usuario.enum';
import { AuthenticatedUser }      from '../../common/interfaces/authenticated-user.interface';

@ApiTags('Evidências')
@ApiBearerAuth('jwt')
@Roles(
  PerfilUsuario.PROFESSOR,
  PerfilUsuario.COORDENADOR,
  PerfilUsuario.EQUIPE_PEDAGOGICA,
  PerfilUsuario.DIRETOR,
  PerfilUsuario.ADMIN,
)
@Controller('evidencias')
export class EvidenciasController {
  constructor(private readonly service: EvidenciasService) {}

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Gerar URL pré-assinada para upload direto ao S3 (RF-07)',
    description:
      'Retorna uma PUT URL com TTL de 15 min. ' +
      'O frontend faz o upload diretamente ao S3 sem passar pelo NestJS (H-11). ' +
      'Após o PUT, chamar /confirmar para registrar a evidência.',
  })
  @ApiResponse({ status: 201, type: PresignedUrlResponseDto })
  @ApiResponse({ status: 400, description: 'MIME não permitido ou tamanho excede 50 MB' })
  gerarPresignedUrl(
    @Body() dto: PresignedUrlDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PresignedUrlResponseDto> {
    return this.service.gerarPresignedUrl(dto, user);
  }

  @Post('confirmar')
  @ApiOperation({
    summary: 'Confirmar upload e registrar evidência (RF-07)',
    description:
      'Chamado após o frontend completar o PUT ao S3. ' +
      'Valida magic bytes do objeto no S3 (H-02) antes de persistir.',
  })
  @ApiResponse({ status: 201, type: EvidenciaResponseDto })
  @ApiResponse({ status: 400, description: 'Tipo de arquivo inválido detectado (magic bytes)' })
  confirmarUpload(
    @Body() dto: ConfirmarUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EvidenciaResponseDto> {
    return this.service.confirmarUpload(dto, user);
  }

  @Get('ocorrencia/:ocorrenciaId')
  @ApiOperation({ summary: 'Listar evidências de uma ocorrência (RF-07)' })
  @ApiParam({ name: 'ocorrenciaId', description: 'UUID da ocorrência' })
  @ApiResponse({ status: 200, type: [EvidenciaResponseDto],
    description: 'Lista com URL pré-assinada de download (TTL 15 min) para cada evidência' })
  listarPorOcorrencia(
    @Param('ocorrenciaId', ParseUUIDPipe) ocorrenciaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<EvidenciaResponseDto[]> {
    return this.service.listarPorOcorrencia(ocorrenciaId, user);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover evidência (RF-07)',
    description:
      'Remove do banco e do S3. ' +
      'Permitido ao uploader original ou perfis COORDENADOR/DIRETOR/ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID da evidência' })
  @ApiResponse({ status: 200, description: 'Evidência removida' })
  @ApiResponse({ status: 403, description: 'Apenas uploader ou perfil superior pode remover' })
  @ApiResponse({ status: 404, description: 'Evidência não encontrada' })
  remover(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.service.remover(id, user);
  }
}
