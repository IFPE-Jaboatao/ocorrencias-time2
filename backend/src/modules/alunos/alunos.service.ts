import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository }              from '@nestjs/typeorm';
import { Repository }                    from 'typeorm';
import { differenceInYears }             from 'date-fns';
import * as XLSX                         from 'xlsx';
import { Aluno, StatusAluno }            from './entities/aluno.entity';
import { CreateAlunoDto }                from './dto/create-aluno.dto';
import { UpdateAlunoDto }                from './dto/update-aluno.dto';
import { FilterAlunoDto }               from './dto/filter-aluno.dto';
import { AuthenticatedUser }             from '../../common/interfaces/authenticated-user.interface';
import { PerfilUsuario }                 from '../../common/enums/perfil-usuario.enum';
import { MAIORIDADE_LEGAL }              from '../../common/constants/domain.constants';
import { PaginatedResponseDto }          from '../../common/dto/paginated-response.dto';

/** Colunas obrigatórias do Excel de importação */
const COLUNAS_EXCEL = ['matricula', 'nome', 'dataNascimento', 'segmento', 'campus', 'curso', 'turma'] as const;

@Injectable()
export class AlunosService {
  constructor(
    @InjectRepository(Aluno)
    private readonly repo: Repository<Aluno>,
  ) {}

  async criar(dto: CreateAlunoDto): Promise<Aluno> {
    const existente = await this.repo.findOne({ where: { matricula: dto.matricula } });
    if (existente) throw new ConflictException(`Matrícula '${dto.matricula}' já está cadastrada.`);
    return this.repo.save(this.repo.create(dto));
  }

  async atualizar(id: string, dto: UpdateAlunoDto): Promise<Aluno> {
    const aluno = await this.buscarPorId(id);
    Object.assign(aluno, dto);
    return this.repo.save(aluno);
  }

  // Listagem paginada com filtros — para a tela de gestão de alunos
  async listar(filtros: FilterAlunoDto, usuario: AuthenticatedUser): Promise<PaginatedResponseDto<Aluno>> {
    const page     = filtros.page     ?? 1;
    const pageSize = filtros.pageSize ?? 20;

    const qb = this.repo.createQueryBuilder('a').orderBy('a.nome', 'ASC');

    // Escopo por campus (H-08): coordenadores e professores só veem seu campus
    if (usuario.perfil !== PerfilUsuario.ADMIN && usuario.perfil !== PerfilUsuario.DIRETOR) {
      qb.andWhere('a.campus = :campus', { campus: usuario.campus });
    }

    if (filtros.q?.trim()) {
      qb.andWhere('(a.matricula LIKE :q OR a.nome LIKE :q)', { q: `%${filtros.q.trim()}%` });
    }

    if (filtros.segmento)  qb.andWhere('a.segmento = :seg',    { seg: filtros.segmento });
    if (filtros.status)    qb.andWhere('a.status = :status',   { status: filtros.status });
    if (filtros.campus && (usuario.perfil === PerfilUsuario.ADMIN || usuario.perfil === PerfilUsuario.DIRETOR)) {
      qb.andWhere('a.campus = :campusFiltro', { campusFiltro: filtros.campus });
    }

    const [data, total] = await qb.skip((page - 1) * pageSize).take(pageSize).getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Busca rápida (autocomplete dropdown) com escopo por campus/segmento conforme perfil (H-08)
  // q vazio ou só espaços → retorna todos os alunos do escopo (usado no dropdown ao clicar)
  async buscar(matriculaOuNome: string, usuario: AuthenticatedUser): Promise<Aluno[]> {
    const termo = matriculaOuNome.trim();
    const qb = this.repo.createQueryBuilder('a')
      .andWhere('a.status = :status', { status: StatusAluno.ATIVO })
      .orderBy('a.nome', 'ASC')
      .take(50); // limite de segurança

    if (termo) {
      qb.andWhere('(a.matricula LIKE :q OR a.nome LIKE :q)', { q: `%${termo}%` });
    }

    if (usuario.perfil !== PerfilUsuario.ADMIN && usuario.perfil !== PerfilUsuario.DIRETOR) {
      qb.andWhere('a.campus = :campus', { campus: usuario.campus });
    }

    return qb.getMany();
  }

  async buscarPorId(id: string): Promise<Aluno> {
    const aluno = await this.repo.findOne({ where: { id } });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');
    return aluno;
  }

  eMenorDeIdade(dataNascimento: Date): boolean {
    return differenceInYears(new Date(), dataNascimento) < MAIORIDADE_LEGAL;
  }

  // ── Importação em lote via Excel ──────────────────────────────────────────

  async importarLote(buffer: Buffer): Promise<{ importados: number; ignorados: number; erros: string[] }> {
    const wb   = XLSX.read(buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (rows.length === 0) {
      throw new BadRequestException('Planilha vazia — nenhuma linha encontrada.');
    }

    const erros: string[] = [];
    let importados = 0;
    let ignorados  = 0;

    for (let i = 0; i < rows.length; i++) {
      const linha = i + 2; // linha 1 = cabeçalho, dados a partir da 2
      const row   = rows[i];

      // Verificar colunas obrigatórias
      const faltando = COLUNAS_EXCEL.filter(c => !row[c] && row[c] !== 0);
      if (faltando.length > 0) {
        erros.push(`Linha ${linha}: colunas obrigatórias ausentes — ${faltando.join(', ')}`);
        continue;
      }

      const matricula = String(row['matricula']).trim();
      const nome      = String(row['nome']).trim();
      const dataNasc  = String(row['dataNascimento']).trim();
      const segmento  = String(row['segmento']).trim().toUpperCase();
      const campus    = String(row['campus']).trim();
      const curso     = String(row['curso']).trim();
      const turma     = String(row['turma']).trim();

      // Validar segmento
      if (!['FUNDAMENTAL', 'MEDIO', 'SUPERIOR'].includes(segmento)) {
        erros.push(`Linha ${linha}: segmento inválido "${segmento}" — use FUNDAMENTAL, MEDIO ou SUPERIOR`);
        continue;
      }

      // Validar data no formato YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dataNasc)) {
        erros.push(`Linha ${linha}: dataNascimento "${dataNasc}" deve estar no formato AAAA-MM-DD`);
        continue;
      }

      try {
        // INSERT IGNORE by matricula — duplicatas são simplesmente ignoradas
        const existente = await this.repo.findOne({ where: { matricula } });
        if (existente) {
          ignorados++;
          continue;
        }

        await this.repo.save(this.repo.create({
          matricula, nome, dataNascimento: dataNasc as any,
          segmento: segmento as any, campus, curso, turma,
          status: StatusAluno.ATIVO,
        }));
        importados++;
      } catch (err: any) {
        erros.push(`Linha ${linha}: erro ao salvar — ${err?.message ?? 'erro desconhecido'}`);
      }
    }

    return { importados, ignorados, erros };
  }

  // ── Opções de autocomplete ────────────────────────────────────────────────

  async getOpcoes(): Promise<{ campi: string[]; cursos: string[] }> {
    const [campiRows, cursosRows] = await Promise.all([
      this.repo.createQueryBuilder('a').select('DISTINCT a.campus', 'campus').getRawMany(),
      this.repo.createQueryBuilder('a').select('DISTINCT a.curso', 'curso').getRawMany(),
    ]);
    return {
      campi:  campiRows.map((r: any) => r.campus).filter(Boolean).sort(),
      cursos: cursosRows.map((r: any) => r.curso).filter(Boolean).sort(),
    };
  }

  // ── Template Excel para download ──────────────────────────────────────────

  gerarTemplate(): Buffer {
    const wb  = XLSX.utils.book_new();
    const cabecalho = [[...COLUNAS_EXCEL]];

    // Linha de exemplo
    const exemplo = [[
      '2025001', 'Maria Oliveira Silva', '2010-05-20',
      'FUNDAMENTAL', 'Campus A', 'Ensino Fundamental', '6ºA',
    ]];

    const ws = XLSX.utils.aoa_to_sheet([...cabecalho, ...exemplo]);

    // Largura das colunas
    ws['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 16 },
      { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 8 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
