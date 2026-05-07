import { Test, TestingModule } from '@nestjs/testing';
import { RelatoriosController } from './relatorios.controller';
import { RelatoriosService }    from './relatorios.service';
import { FiltroRelatorioDto }   from './dto/filtro-relatorio.dto';
import { Response }             from 'express';

const makeFiltros = (): FiltroRelatorioDto => ({
  dataInicio: '2026-01-01',
  dataFim:    '2026-12-31',
});

const makeSvc = () => ({
  resumo:      jest.fn().mockResolvedValue({}),
  exportarCsv: jest.fn().mockResolvedValue('Código;Aluno\r\n"OC-001";"João"'),
});

const makeRes = () =>
  ({ setHeader: jest.fn(), send: jest.fn() }) as unknown as Response;

describe('RelatoriosController', () => {
  let controller: RelatoriosController;
  let service: ReturnType<typeof makeSvc>;

  beforeEach(async () => {
    service = makeSvc();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelatoriosController],
      providers:   [{ provide: RelatoriosService, useValue: service }],
    }).compile();

    controller = module.get(RelatoriosController);
  });

  describe('resumo()', () => {
    it('deve delegar ao service.resumo() passando os filtros', async () => {
      const filtros = makeFiltros();

      const result = await controller.resumo(filtros);

      expect(service.resumo).toHaveBeenCalledWith(filtros);
      expect(result).toEqual({});
    });

    it('deve retornar o que o service.resumo() retornar', async () => {
      const payload = { totalOcorrencias: 42, slaVencidas: 3, porStatus: { ABERTA: 10 } };
      service.resumo.mockResolvedValue(payload);

      const result = await controller.resumo(makeFiltros());

      expect(result).toBe(payload);
    });
  });

  describe('exportar()', () => {
    it('deve delegar ao service.exportarCsv() passando os filtros', async () => {
      const filtros = makeFiltros();
      const res     = makeRes();

      await controller.exportar(filtros, res);

      expect(service.exportarCsv).toHaveBeenCalledWith(filtros);
    });

    it('deve definir Content-Type como text/csv com charset utf-8', async () => {
      const res = makeRes();

      await controller.exportar(makeFiltros(), res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
    });

    it('deve definir Content-Disposition como attachment com nome de arquivo incluindo data', async () => {
      const res = makeRes();

      await controller.exportar(makeFiltros(), res);

      const callArgs = (res.setHeader as jest.Mock).mock.calls;
      const dispositionCall = callArgs.find(([header]) => header === 'Content-Disposition');
      expect(dispositionCall).toBeDefined();
      const dispositionValue: string = dispositionCall![1];
      expect(dispositionValue).toMatch(/attachment; filename="radar-academico-ocorrencias-\d{4}-\d{2}-\d{2}\.csv"/);
    });

    it('deve enviar o CSV com BOM UTF-8 prefixado', async () => {
      const csvContent = 'Código;Aluno\r\n"OC-001";"João"';
      service.exportarCsv.mockResolvedValue(csvContent);
      const res = makeRes();

      await controller.exportar(makeFiltros(), res);

      expect(res.send).toHaveBeenCalledWith('﻿' + csvContent);
    });
  });
});
