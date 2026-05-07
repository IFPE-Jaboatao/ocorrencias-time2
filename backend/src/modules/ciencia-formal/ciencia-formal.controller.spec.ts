import { Test, TestingModule } from '@nestjs/testing';
import { CienciaFormalController } from './ciencia-formal.controller';
import { CienciaFormalService }    from './ciencia-formal.service';
import { Request }                 from 'express';

const makeSvc = () => ({
  buscarPorToken: jest.fn().mockResolvedValue({}),
  confirmar:      jest.fn().mockResolvedValue({}),
});

describe('CienciaFormalController', () => {
  let controller: CienciaFormalController;
  let service: ReturnType<typeof makeSvc>;

  beforeEach(async () => {
    service = makeSvc();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CienciaFormalController],
      providers:   [{ provide: CienciaFormalService, useValue: service }],
    }).compile();

    controller = module.get(CienciaFormalController);
  });

  describe('visualizar()', () => {
    it('deve delegar ao service.buscarPorToken() com o token recebido', async () => {
      const token = 'abc123';
      const result = await controller.visualizar(token);

      expect(service.buscarPorToken).toHaveBeenCalledWith(token);
      expect(result).toEqual({});
    });
  });

  describe('confirmar()', () => {
    it('deve extrair IP do header x-forwarded-for e delegar ao service.confirmar()', async () => {
      const token = 'abc123';
      const req = {
        headers: { 'x-forwarded-for': '192.168.1.1', 'user-agent': 'Mozilla/5.0' },
        ip: '127.0.0.1',
      } as unknown as Request;

      const result = await controller.confirmar(token, req);

      expect(service.confirmar).toHaveBeenCalledWith(token, '192.168.1.1', 'Mozilla/5.0');
      expect(result).toEqual({});
    });

    it('deve usar req.ip como fallback quando x-forwarded-for está ausente', async () => {
      const token = 'abc123';
      const req = {
        headers:    { 'user-agent': 'TestAgent/1.0' },
        ip:         '10.0.0.5',
      } as unknown as Request;

      await controller.confirmar(token, req);

      expect(service.confirmar).toHaveBeenCalledWith(token, '10.0.0.5', 'TestAgent/1.0');
    });

    it('deve usar "0.0.0.0" quando nem x-forwarded-for nem req.ip estão presentes', async () => {
      const token = 'abc123';
      const req = {
        headers: {},
        ip:      undefined,
      } as unknown as Request;

      await controller.confirmar(token, req);

      expect(service.confirmar).toHaveBeenCalledWith(token, '0.0.0.0', '');
    });

    it('deve usar string vazia para user-agent quando o header está ausente', async () => {
      const token = 'abc123';
      const req = {
        headers: { 'x-forwarded-for': '1.2.3.4' },
        ip:      '127.0.0.1',
      } as unknown as Request;

      await controller.confirmar(token, req);

      expect(service.confirmar).toHaveBeenCalledWith(token, '1.2.3.4', '');
    });
  });
});
