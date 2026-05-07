import { Test, TestingModule } from '@nestjs/testing';
import { AlunosController }    from './alunos.controller';
import { AlunosService }       from './alunos.service';
import { AuthenticatedUser }   from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }       from '../../common/enums/perfil-usuario.enum';

const makeUser = (): AuthenticatedUser => ({
  sub:       'uid-1',
  perfil:    PerfilUsuario.PROFESSOR,
  campus:    'Campus A',
  segmentos: [],
  email:     'prof@escola.edu.br',
  nome:      'Professor Teste',
});

describe('AlunosController', () => {
  let ctrl: AlunosController;
  let svc: jest.Mocked<AlunosService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlunosController],
      providers: [
        {
          provide: AlunosService,
          useValue: {
            criar:       jest.fn(),
            buscar:      jest.fn(),
            buscarPorId: jest.fn(),
          },
        },
      ],
    }).compile();

    ctrl = module.get(AlunosController);
    svc  = module.get(AlunosService) as jest.Mocked<AlunosService>;
  });

  describe('criar()', () => {
    it('deve delegar ao service.criar com o DTO recebido', async () => {
      const dto = {
        matricula: '2026001',
        nome: 'Aluno Teste',
        dataNascimento: '2010-05-01',
        segmento: 'FUNDAMENTAL' as any,
        campus: 'Campus A',
        curso: 'Ensino Fundamental',
        turma: '9A',
      } as any;
      const alunoSalvo = { id: 'uuid-2', ...dto };
      svc.criar.mockResolvedValue(alunoSalvo as any);

      const result = await ctrl.criar(dto);

      expect(svc.criar).toHaveBeenCalledWith(dto);
      expect(result).toEqual(alunoSalvo);
    });
  });

  describe('buscar()', () => {
    it('deve delegar ao service.buscar com o termo de busca e o usuário autenticado', async () => {
      const user = makeUser();
      const alunos = [{ id: 'uuid-2', nome: 'Ana Lima' }];
      svc.buscar.mockResolvedValue(alunos as any);

      const result = await ctrl.buscar('Ana', user);

      expect(svc.buscar).toHaveBeenCalledWith('Ana', user);
      expect(result).toEqual(alunos);
    });

    it('deve passar string vazia ao service quando query não for informada', async () => {
      const user = makeUser();
      svc.buscar.mockResolvedValue([]);

      await ctrl.buscar('', user);

      expect(svc.buscar).toHaveBeenCalledWith('', user);
    });
  });

  describe('buscarPorId()', () => {
    it('deve delegar ao service.buscarPorId com o id de rota', async () => {
      const aluno = { id: 'uuid-2', nome: 'Ana Lima' };
      svc.buscarPorId.mockResolvedValue(aluno as any);

      const result = await ctrl.buscarPorId('uuid-2');

      expect(svc.buscarPorId).toHaveBeenCalledWith('uuid-2');
      expect(result).toEqual(aluno);
    });
  });
});
