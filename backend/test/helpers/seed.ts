import { DataSource }         from 'typeorm';
import { Usuario }            from '@/modules/usuarios/entities/usuario.entity';
import { Aluno, StatusAluno } from '@/modules/alunos/entities/aluno.entity';
import { CategoriaOcorrencia } from '@/modules/categorias/entities/categoria-ocorrencia.entity';
import { Turma }              from '@/modules/turmas/entities/turma.entity';
import { PapelUsuarioTurma, UsuarioTurma } from '@/modules/turmas/entities/usuario-turma.entity';
import { PerfilUsuario }      from '@/common/enums/perfil-usuario.enum';
import { Segmento }           from '@/common/enums/segmento.enum';

export interface SeedResult {
  professor: Usuario;
  coordenador: Usuario;
  coordenadorB: Usuario;
  diretor: Usuario;
  admin: Usuario;
  alunoMenor: Aluno;
  alunoMaior: Aluno;
  categoria: CategoriaOcorrencia;
}

async function findOrCreate<T extends object>(
  repo: any,
  where: Partial<T>,
  data: Partial<T>,
): Promise<T> {
  const existing = await repo.findOne({ where });
  if (existing) return existing;
  return repo.save(repo.create(data));
}

export async function seedTestData(dataSource: DataSource): Promise<SeedResult> {
  const usuarioRepo   = dataSource.getRepository(Usuario);
  const alunoRepo     = dataSource.getRepository(Aluno);
  const categoriaRepo = dataSource.getRepository(CategoriaOcorrencia);
  const turmaRepo     = dataSource.getRepository(Turma);
  const usuarioTurmaRepo = dataSource.getRepository(UsuarioTurma);

  const professor = await findOrCreate<Usuario>(usuarioRepo,
    { email: 'professor.e2e@escola.edu.br' },
    { nome: 'Professor Teste', email: 'professor.e2e@escola.edu.br', perfil: PerfilUsuario.PROFESSOR, campus: 'Campus A', segmentosResponsaveis: [Segmento.FUNDAMENTAL], ativo: true },
  );

  const coordenador = await findOrCreate<Usuario>(usuarioRepo,
    { email: 'coordenador.e2e@escola.edu.br' },
    { nome: 'Coordenador Teste', email: 'coordenador.e2e@escola.edu.br', perfil: PerfilUsuario.COORDENADOR, campus: 'Campus A', segmentosResponsaveis: [Segmento.FUNDAMENTAL], ativo: true },
  );

  const coordenadorB = await findOrCreate<Usuario>(usuarioRepo,
    { email: 'coordenadorb.e2e@escola.edu.br' },
    { nome: 'Coordenador Campus B', email: 'coordenadorb.e2e@escola.edu.br', perfil: PerfilUsuario.COORDENADOR, campus: 'Campus B', segmentosResponsaveis: [Segmento.FUNDAMENTAL], ativo: true },
  );

  const diretor = await findOrCreate<Usuario>(usuarioRepo,
    { email: 'diretor.e2e@escola.edu.br' },
    { nome: 'Diretor Teste', email: 'diretor.e2e@escola.edu.br', perfil: PerfilUsuario.DIRETOR, campus: 'Campus A', segmentosResponsaveis: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR], ativo: true },
  );

  const admin = await findOrCreate<Usuario>(usuarioRepo,
    { email: 'admin.e2e@escola.edu.br' },
    { nome: 'Admin Teste', email: 'admin.e2e@escola.edu.br', perfil: PerfilUsuario.ADMIN, campus: 'Campus A', segmentosResponsaveis: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR], ativo: true },
  );

  const turmaFundamental = await findOrCreate<Turma>(turmaRepo,
    { nome: '5A', segmento: Segmento.FUNDAMENTAL, campus: 'Campus A', curso: 'Ensino Fundamental', anoLetivo: 2026 },
    { nome: '5A', segmento: Segmento.FUNDAMENTAL, campus: 'Campus A', curso: 'Ensino Fundamental', anoLetivo: 2026, ativo: true },
  );

  const turmaSuperior = await findOrCreate<Turma>(turmaRepo,
    { nome: 'ENG2026', segmento: Segmento.SUPERIOR, campus: 'Campus A', curso: 'Engenharia', anoLetivo: 2026 },
    { nome: 'ENG2026', segmento: Segmento.SUPERIOR, campus: 'Campus A', curso: 'Engenharia', anoLetivo: 2026, ativo: true },
  );

  await findOrCreate<UsuarioTurma>(usuarioTurmaRepo,
    { usuarioId: professor.id, turmaId: turmaFundamental.id },
    { usuarioId: professor.id, turmaId: turmaFundamental.id, papel: PapelUsuarioTurma.PROFESSOR, ativo: true },
  );

  const alunoMenor = await findOrCreate<Aluno>(alunoRepo,
    { matricula: 'E2E-001' },
    { matricula: 'E2E-001', nome: 'Aluno Menor E2E', dataNascimento: new Date('2010-01-01'), segmento: Segmento.FUNDAMENTAL, campus: 'Campus A', curso: 'Ensino Fundamental', turma: '5A', turmaId: turmaFundamental.id, status: StatusAluno.ATIVO },
  );
  if (alunoMenor.turmaId !== turmaFundamental.id) {
    await alunoRepo.update(alunoMenor.id, { turmaId: turmaFundamental.id });
    alunoMenor.turmaId = turmaFundamental.id;
  }

  const alunoMaior = await findOrCreate<Aluno>(alunoRepo,
    { matricula: 'E2E-002' },
    { matricula: 'E2E-002', nome: 'Aluno Maior E2E', dataNascimento: new Date('2000-01-01'), segmento: Segmento.SUPERIOR, campus: 'Campus A', curso: 'Engenharia', turma: 'ENG2026', turmaId: turmaSuperior.id, status: StatusAluno.ATIVO },
  );
  if (alunoMaior.turmaId !== turmaSuperior.id) {
    await alunoRepo.update(alunoMaior.id, { turmaId: turmaSuperior.id });
    alunoMaior.turmaId = turmaSuperior.id;
  }

  const categoria = await findOrCreate<CategoriaOcorrencia>(categoriaRepo,
    { nome: 'Disciplinar E2E' },
    { nome: 'Disciplinar E2E', subcategorias: ['Agressão', 'Bullying'], severidadePadrao: 2, slaHoras: 72, exigeNotifResponsavel: false, obrigatorioLegal: false, segmentosAplicaveis: [Segmento.FUNDAMENTAL, Segmento.MEDIO, Segmento.SUPERIOR], exigeValidacao: false, ativo: true },
  );

  return { professor, coordenador, coordenadorB, diretor, admin, alunoMenor, alunoMaior, categoria };
}
