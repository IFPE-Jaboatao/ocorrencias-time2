import { Test, TestingModule }         from '@nestjs/testing';
import { getRepositoryToken }          from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash }                  from 'crypto';
import { subDays, addDays }            from 'date-fns';
import { CienciaFormalService }        from './ciencia-formal.service';
import { CienciaFormal }               from './entities/ciencia-formal.entity';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex');
}

const makeCiencia = (o: any = {}): CienciaFormal => ({
  id:              'cf-1',
  ocorrenciaId:    'oc-1',
  destinatarioTipo: 'RESPONSAVEL' as any,
  destinatarioId:  'resp-1',
  tokenHash:       hashToken('token-valido'),
  hashConteudo:    'abc123',
  dataEnvio:       new Date(),           // hoje por padrão → dentro do prazo
  dataConfirmacao: null as any,
  ipConfirmacao:   null as any,
  userAgent:       null as any,
  ocorrencia:      null as any,
  ...o,
});

// ─── Suite ───────────────────────────────────────────────────────────────────

describe('CienciaFormalService', () => {
  let service: CienciaFormalService;
  let repo: {
    save:     jest.Mock;
    create:   jest.Mock;
    findOne:  jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      save:    jest.fn().mockImplementation(e => Promise.resolve({ id: 'cf-novo', ...e })),
      create:  jest.fn().mockImplementation(d => d),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CienciaFormalService,
        { provide: getRepositoryToken(CienciaFormal), useValue: repo },
      ],
    }).compile();

    service = module.get(CienciaFormalService);
  });

  // ── gerar() ───────────────────────────────────────────────────────────────

  describe('gerar()', () => {
    it('deve retornar token raw e ciencia persistida', async () => {
      const { token, ciencia } = await service.gerar('oc-1', 'RESPONSAVEL', 'resp-1', 'hash-doc');

      expect(typeof token).toBe('string');
      expect(token.length).toBe(64);          // randomBytes(32).toString('hex')
      expect(repo.save).toHaveBeenCalled();
      expect(ciencia).toBeDefined();
    });

    it('deve armazenar o HASH do token, nunca o token raw (H-07)', async () => {
      const { token } = await service.gerar('oc-1', 'ALUNO', 'aluno-1', 'hash-doc');
      const expectedHash = hashToken(token);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tokenHash: expectedHash }),
      );
      // o token raw nunca deve aparecer no que é persistido
      const createArg = repo.create.mock.calls[0][0];
      expect(createArg.tokenHash).not.toBe(token);
    });

    it('deve gerar tokens diferentes a cada chamada', async () => {
      const { token: t1 } = await service.gerar('oc-1', 'ALUNO', 'a-1', 'h1');
      const { token: t2 } = await service.gerar('oc-1', 'ALUNO', 'a-1', 'h1');

      expect(t1).not.toBe(t2);
    });

    it('deve persistir com dataConfirmacao null', async () => {
      await service.gerar('oc-1', 'RESPONSAVEL', 'r-1', 'hash');

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ dataConfirmacao: null }),
      );
    });
  });

  // ── confirmar() ───────────────────────────────────────────────────────────

  describe('confirmar()', () => {
    it('deve confirmar ciência com token válido (fluxo feliz, H-07)', async () => {
      repo.findOne.mockResolvedValue(makeCiencia({ dataEnvio: new Date() }));

      const result = await service.confirmar('token-valido', '1.2.3.4', 'Mozilla/5');

      expect(result.dataConfirmacao).toBeInstanceOf(Date);
      expect(result.ipConfirmacao).toBe('1.2.3.4');
      expect(result.userAgent).toBe('Mozilla/5');
      expect(repo.save).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando token não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.confirmar('token-inexistente', '1.1.1.1', 'UA'),
      ).rejects.toThrow(NotFoundException);
    });

    it('H-07: deve lançar BadRequestException quando token já foi utilizado', async () => {
      repo.findOne.mockResolvedValue(
        makeCiencia({ dataConfirmacao: new Date('2026-01-01') }),
      );

      await expect(
        service.confirmar('token-valido', '1.1.1.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('H-07: deve lançar BadRequestException quando token expirou (> 5 dias úteis)', async () => {
      // dataEnvio = 10 dias atrás → definitivamente expirado
      repo.findOne.mockResolvedValue(
        makeCiencia({ dataEnvio: subDays(new Date(), 10) }),
      );

      await expect(
        service.confirmar('token-valido', '1.1.1.1', 'UA'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve aceitar token enviado hoje (dentro do prazo de 5 dias úteis)', async () => {
      repo.findOne.mockResolvedValue(makeCiencia({ dataEnvio: new Date() }));

      await expect(
        service.confirmar('token-valido', '1.1.1.1', 'UA'),
      ).resolves.not.toThrow();
    });

    it('deve buscar ciencia pelo hash SHA-256 do token raw', async () => {
      repo.findOne.mockResolvedValue(makeCiencia());

      await service.confirmar('token-valido', '1.1.1.1', 'UA');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: hashToken('token-valido') },
      });
    });
  });

  // ── buscarPorToken() ──────────────────────────────────────────────────────

  describe('buscarPorToken()', () => {
    it('deve buscar pelo hash do token com relação ocorrencia', async () => {
      repo.findOne.mockResolvedValue(makeCiencia());

      await service.buscarPorToken('meu-token');

      expect(repo.findOne).toHaveBeenCalledWith({
        where:     { tokenHash: hashToken('meu-token') },
        relations: ['ocorrencia'],
      });
    });

    it('deve retornar null quando token não existe', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.buscarPorToken('inexistente');

      expect(result).toBeNull();
    });
  });
});
