import { Test, TestingModule }  from '@nestjs/testing';
import { getRepositoryToken }   from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EvidenciasService }    from './evidencias.service';
import { UploadService }        from './upload.service';
import { Evidencia }            from './entities/evidencia.entity';
import { PerfilUsuario }        from '../../common/enums/perfil-usuario.enum';
import { Segmento }             from '../../common/enums/segmento.enum';
import { AuthenticatedUser }    from '../../common/interfaces/authenticated-user.interface';

const makeUser = (overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser => ({
  sub:       'user-uid',
  email:     'prof@escola.edu.br',
  nome:      'Professor',
  perfil:    PerfilUsuario.PROFESSOR,
  campus:    'Campus A',
  segmentos: [Segmento.FUNDAMENTAL],
  ...overrides,
});

const makeEvidencia = (overrides: Partial<Evidencia> = {}): Evidencia => ({
  id:           'ev-001',
  ocorrenciaId: 'oc-001',
  nomeOriginal: 'foto.jpg',
  s3Key:        'evidencias/oc-001/uuid-foto.jpg',
  mimeType:     'image/jpeg',
  tamanhoBytes: 204800,
  enviadoPorId: 'user-uid',
  criadoEm:     new Date('2026-05-01'),
  ocorrencia:   {} as any,
  enviadoPor:   {} as any,
  ...overrides,
} as Evidencia);

describe('EvidenciasService', () => {
  let service: EvidenciasService;
  let repo:    { find: jest.Mock; findOne: jest.Mock; create: jest.Mock; save: jest.Mock; delete: jest.Mock };
  let upload:  { gerarPresignedUploadUrl: jest.Mock; gerarPresignedDownloadUrl: jest.Mock; validarMimeNoS3: jest.Mock; removerDoS3: jest.Mock };

  beforeEach(async () => {
    repo = {
      find:    jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create:  jest.fn().mockImplementation(d => d),
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'ev-novo', ...e })),
      delete:  jest.fn().mockResolvedValue(undefined),
    };

    upload = {
      gerarPresignedUploadUrl:  jest.fn().mockResolvedValue({ uploadUrl: 'https://s3.put', s3Key: 's3/key' }),
      gerarPresignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.get'),
      validarMimeNoS3:          jest.fn().mockResolvedValue(undefined),
      removerDoS3:              jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenciasService,
        { provide: getRepositoryToken(Evidencia), useValue: repo },
        { provide: UploadService, useValue: upload },
      ],
    }).compile();

    service = module.get(EvidenciasService);
  });

  // ── gerarPresignedUrl() ─────────────────────────────────────────────────────

  describe('gerarPresignedUrl()', () => {
    it('deve delegar ao UploadService com os dados do DTO', async () => {
      const dto    = { ocorrenciaId: 'oc-001', nomeArquivo: 'doc.pdf', mimeType: 'application/pdf', tamanhoBytes: 1024 };
      const result = await service.gerarPresignedUrl(dto as any, makeUser());

      expect(upload.gerarPresignedUploadUrl).toHaveBeenCalledWith('oc-001', 'doc.pdf', 'application/pdf');
      expect(result).toEqual({ uploadUrl: 'https://s3.put', s3Key: 's3/key' });
    });
  });

  // ── confirmarUpload() ───────────────────────────────────────────────────────

  describe('confirmarUpload()', () => {
    const dto = {
      s3Key: 'evidencias/oc-001/uuid.pdf', ocorrenciaId: 'oc-001',
      nomeOriginal: 'relatorio.pdf', mimeType: 'application/pdf', tamanhoBytes: 2048,
    };

    it('deve validar MIME no S3 antes de persistir (H-02)', async () => {
      repo.save.mockResolvedValue(makeEvidencia({ id: 'ev-novo' }));
      await service.confirmarUpload(dto as any, makeUser());
      expect(upload.validarMimeNoS3).toHaveBeenCalledWith(dto.s3Key, dto.mimeType);
    });

    it('deve persistir a evidência com os dados corretos', async () => {
      const ev = makeEvidencia();
      repo.save.mockResolvedValue(ev);
      const result = await service.confirmarUpload(dto as any, makeUser());

      expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
        ocorrenciaId: dto.ocorrenciaId,
        s3Key:        dto.s3Key,
        enviadoPorId: 'user-uid',
      }));
      expect(result.url).toBe('https://s3.get');
    });
  });

  // ── listarPorOcorrencia() ───────────────────────────────────────────────────

  describe('listarPorOcorrencia()', () => {
    it('deve retornar lista com URL pré-assinada para cada evidência', async () => {
      repo.find.mockResolvedValue([makeEvidencia(), makeEvidencia({ id: 'ev-002' })]);
      const result = await service.listarPorOcorrencia('oc-001', makeUser());

      expect(repo.find).toHaveBeenCalledWith({ where: { ocorrenciaId: 'oc-001' }, order: { criadoEm: 'ASC' } });
      expect(result).toHaveLength(2);
      expect(result[0].url).toBe('https://s3.get');
    });

    it('deve retornar lista vazia se não houver evidências', async () => {
      repo.find.mockResolvedValue([]);
      const result = await service.listarPorOcorrencia('oc-sem', makeUser());
      expect(result).toEqual([]);
    });
  });

  // ── remover() ───────────────────────────────────────────────────────────────

  describe('remover()', () => {
    it('deve lançar NotFoundException se evidência não existir', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.remover('nao-existe', makeUser())).rejects.toThrow(NotFoundException);
    });

    it('deve permitir que o uploader remova a própria evidência', async () => {
      repo.findOne.mockResolvedValue(makeEvidencia({ enviadoPorId: 'user-uid' }));
      await service.remover('ev-001', makeUser({ sub: 'user-uid' }));

      expect(upload.removerDoS3).toHaveBeenCalledWith('evidencias/oc-001/uuid-foto.jpg');
      expect(repo.delete).toHaveBeenCalledWith('ev-001');
    });

    it('deve permitir que ADMIN remova evidência de outro usuário', async () => {
      repo.findOne.mockResolvedValue(makeEvidencia({ enviadoPorId: 'outro-uid' }));
      await service.remover('ev-001', makeUser({ sub: 'admin-uid', perfil: PerfilUsuario.ADMIN }));

      expect(upload.removerDoS3).toHaveBeenCalled();
      expect(repo.delete).toHaveBeenCalledWith('ev-001');
    });

    it('deve lançar ForbiddenException se professor tentar remover evidência de outro', async () => {
      repo.findOne.mockResolvedValue(makeEvidencia({ enviadoPorId: 'outro-uid' }));
      await expect(
        service.remover('ev-001', makeUser({ sub: 'user-uid', perfil: PerfilUsuario.PROFESSOR })),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve permitir que COORDENADOR remova evidência de outro', async () => {
      repo.findOne.mockResolvedValue(makeEvidencia({ enviadoPorId: 'outro-uid' }));
      await service.remover('ev-001', makeUser({ sub: 'coord-uid', perfil: PerfilUsuario.COORDENADOR }));
      expect(repo.delete).toHaveBeenCalledWith('ev-001');
    });
  });
});
