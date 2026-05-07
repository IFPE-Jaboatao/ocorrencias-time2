import { Test, TestingModule } from '@nestjs/testing';
import { EvidenciasController } from './evidencias.controller';
import { EvidenciasService }    from './evidencias.service';
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

const mockPresigned = { uploadUrl: 'https://s3.put', s3Key: 'ev/key' };
const mockEvidencia = { id: 'ev-001', ocorrenciaId: 'oc-001', nomeOriginal: 'foto.jpg',
                        mimeType: 'image/jpeg', tamanhoBytes: 1024, enviadoPorId: 'user-uid',
                        criadoEm: new Date(), url: 'https://s3.get' };

describe('EvidenciasController', () => {
  let ctrl: EvidenciasController;
  let svc:  jest.Mocked<EvidenciasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenciasController],
      providers: [{
        provide: EvidenciasService,
        useValue: {
          gerarPresignedUrl:   jest.fn().mockResolvedValue(mockPresigned),
          confirmarUpload:     jest.fn().mockResolvedValue(mockEvidencia),
          listarPorOcorrencia: jest.fn().mockResolvedValue([mockEvidencia]),
          remover:             jest.fn().mockResolvedValue(undefined),
        },
      }],
    }).compile();

    ctrl = module.get(EvidenciasController);
    svc  = module.get(EvidenciasService);
  });

  describe('gerarPresignedUrl()', () => {
    it('deve delegar ao service e retornar uploadUrl + s3Key', async () => {
      const dto  = { ocorrenciaId: 'oc-001', nomeArquivo: 'doc.pdf', mimeType: 'application/pdf', tamanhoBytes: 1024 };
      const user = makeUser();
      const res  = await ctrl.gerarPresignedUrl(dto as any, user);

      expect(svc.gerarPresignedUrl).toHaveBeenCalledWith(dto, user);
      expect(res).toEqual(mockPresigned);
    });
  });

  describe('confirmarUpload()', () => {
    it('deve delegar ao service e retornar EvidenciaResponseDto', async () => {
      const dto  = { s3Key: 'ev/key', ocorrenciaId: 'oc-001', nomeOriginal: 'foto.jpg', mimeType: 'image/jpeg', tamanhoBytes: 1024 };
      const user = makeUser();
      const res  = await ctrl.confirmarUpload(dto as any, user);

      expect(svc.confirmarUpload).toHaveBeenCalledWith(dto, user);
      expect(res.url).toBe('https://s3.get');
    });
  });

  describe('listarPorOcorrencia()', () => {
    it('deve retornar lista de evidências da ocorrência', async () => {
      const user = makeUser();
      const res  = await ctrl.listarPorOcorrencia('oc-001', user);

      expect(svc.listarPorOcorrencia).toHaveBeenCalledWith('oc-001', user);
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('ev-001');
    });
  });

  describe('remover()', () => {
    it('deve delegar ao service', async () => {
      const user = makeUser();
      await ctrl.remover('ev-001', user);

      expect(svc.remover).toHaveBeenCalledWith('ev-001', user);
    });
  });
});
