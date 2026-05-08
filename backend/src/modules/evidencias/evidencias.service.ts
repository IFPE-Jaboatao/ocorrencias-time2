import {
  Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Evidencia }        from './entities/evidencia.entity';
import { UploadService }    from './upload.service';
import { PresignedUrlDto }  from './dto/presigned-url.dto';
import { ConfirmarUploadDto } from './dto/confirmar-upload.dto';
import { EvidenciaResponseDto, PresignedUrlResponseDto } from './dto/evidencia-response.dto';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }    from '../../common/enums/perfil-usuario.enum';

@Injectable()
export class EvidenciasService {
  constructor(
    @InjectRepository(Evidencia)
    private readonly repo: Repository<Evidencia>,
    private readonly upload: UploadService,
  ) {}

  /** Gera Pre-signed Upload URL para o frontend enviar diretamente ao S3 (H-11) */
  async gerarPresignedUrl(
    dto: PresignedUrlDto,
    _usuario: AuthenticatedUser,
  ): Promise<PresignedUrlResponseDto> {
    return this.upload.gerarPresignedUploadUrl(
      dto.ocorrenciaId,
      dto.nomeArquivo,
      dto.mimeType,
    );
  }

  /**
   * Confirma o upload: valida MIME no S3 (magic bytes — H-02) e persiste no banco.
   * Chamado pelo frontend APÓS o PUT direto ao S3 ter sido concluído.
   */
  async confirmarUpload(
    dto: ConfirmarUploadDto,
    usuario: AuthenticatedUser,
  ): Promise<EvidenciaResponseDto> {
    // Valida magic bytes no objeto já armazenado no S3
    await this.upload.validarMimeNoS3(dto.s3Key, dto.mimeType);

    const evidencia = this.repo.create({
      ocorrenciaId: dto.ocorrenciaId,
      nomeOriginal: dto.nomeOriginal,
      s3Key:        dto.s3Key,
      mimeType:     dto.mimeType,
      tamanhoBytes: dto.tamanhoBytes,
      enviadoPorId: usuario.sub,
    });
    const salva = await this.repo.save(evidencia);
    return this.toResponseDto(salva);
  }

  /** Lista evidências de uma ocorrência com URL pré-assinada de download (TTL 15 min) */
  async listarPorOcorrencia(
    ocorrenciaId: string,
    _usuario: AuthenticatedUser,
  ): Promise<EvidenciaResponseDto[]> {
    const evidencias = await this.repo.find({
      where: { ocorrenciaId },
      order: { criadoEm: 'ASC' },
    });
    return Promise.all(evidencias.map(e => this.toResponseDto(e)));
  }

  /**
   * Remove evidência do banco e do S3.
   * Apenas o uploader ou perfis ADMIN/DIRETOR/COORDENADOR podem remover.
   */
  async remover(id: string, usuario: AuthenticatedUser): Promise<void> {
    const evidencia = await this.repo.findOne({ where: { id } });
    if (!evidencia) throw new NotFoundException('Evidência não encontrada');

    const podeRemover =
      evidencia.enviadoPorId === usuario.sub ||
      [PerfilUsuario.ADMIN, PerfilUsuario.DIRETOR, PerfilUsuario.COORDENADOR]
        .includes(usuario.perfil);

    if (!podeRemover) {
      throw new ForbiddenException(
        'Você não possui autorização para remover esta evidência.',
      );
    }

    await this.upload.removerDoS3(evidencia.s3Key);
    await this.repo.delete(id);
  }

  private async toResponseDto(e: Evidencia): Promise<EvidenciaResponseDto> {
    const url = await this.upload.gerarPresignedDownloadUrl(e.s3Key);
    return {
      id:           e.id,
      ocorrenciaId: e.ocorrenciaId,
      nomeOriginal: e.nomeOriginal,
      mimeType:     e.mimeType,
      tamanhoBytes: e.tamanhoBytes,
      enviadoPorId: e.enviadoPorId,
      criadoEm:     e.criadoEm,
      url,
    };
  }
}
