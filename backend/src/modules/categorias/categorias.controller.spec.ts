import { Test, TestingModule }   from '@nestjs/testing';
import { CategoriasController }  from './categorias.controller';
import { CategoriasService }     from './categorias.service';

const makeCategoria = (overrides: Record<string, unknown> = {}) => ({
  id:                     'cat-uuid-1',
  nome:                   'Disciplinar',
  subcategorias:          ['Agressão física', 'Bullying'],
  severidadePadrao:       3,
  slaHoras:               48,
  exigeNotifResponsavel:  true,
  obrigatorioLegal:       false,
  segmentosAplicaveis:    ['FUNDAMENTAL', 'MEDIO'],
  exigeValidacao:         true,
  ativo:                  true,
  protocoloExterno:       null,
  ...overrides,
});

describe('CategoriasController', () => {
  let ctrl: CategoriasController;
  let svc: jest.Mocked<CategoriasService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [
        {
          provide: CategoriasService,
          useValue: {
            criar:       jest.fn(),
            listar:      jest.fn(),
            buscarPorId: jest.fn(),
            desativar:   jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(CategoriasController);
    svc  = module.get(CategoriasService) as jest.Mocked<CategoriasService>;
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar com o DTO recebido', async () => {
      const dto = {
        nome: 'Acadêmica',
        subcategorias: ['Plágio'],
        severidadePadrao: 2,
        slaHoras: 72,
        exigeNotifResponsavel: false,
        obrigatorioLegal: false,
        segmentosAplicaveis: ['SUPERIOR'],
        exigeValidacao: false,
      } as any;
      const criada = makeCategoria({ nome: 'Acadêmica' });
      svc.criar.mockResolvedValue(criada as any);

      const result = await ctrl.criar(dto);

      expect(svc.criar).toHaveBeenCalledWith(dto);
      expect(result).toEqual(criada);
    });
  });

  describe('listar()', () => {
    it('deve delegar ao service.listar e retornar a lista', async () => {
      const lista = [makeCategoria(), makeCategoria({ id: 'cat-uuid-2', nome: 'Acadêmica' })];
      svc.listar.mockResolvedValue(lista as any);

      const result = await ctrl.listar();

      expect(svc.listar).toHaveBeenCalled();
      expect(result).toEqual(lista);
    });
  });

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId com o id de rota', async () => {
      const categoria = makeCategoria();
      svc.buscarPorId.mockResolvedValue(categoria as any);

      const result = await ctrl.buscarPorId('cat-uuid-1');

      expect(svc.buscarPorId).toHaveBeenCalledWith('cat-uuid-1');
      expect(result).toEqual(categoria);
    });
  });

  describe('desativar()', () => {
    it('deve delegar ao service.desativar com o id de rota', async () => {
      svc.desativar.mockResolvedValue(undefined);

      const result = await ctrl.desativar('cat-uuid-1');

      expect(svc.desativar).toHaveBeenCalledWith('cat-uuid-1');
      expect(result).toBeUndefined();
    });
  });
});
