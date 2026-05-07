import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Responsavel }         from './entities/responsavel.entity';
import { AlunoResponsavel }    from './entities/aluno-responsavel.entity';
import { CreateResponsavelDto } from './dto/create-responsavel.dto';
import { VincularResponsavelDto } from './dto/vincular-responsavel.dto';
import { UpdateResponsavelDto }   from './dto/update-responsavel.dto';
import { UpdateVinculoDto }       from './dto/update-vinculo.dto';

@Injectable()
export class ResponsaveisService {
  constructor(
    @InjectRepository(Responsavel)
    private readonly respRepo: Repository<Responsavel>,

    @InjectRepository(AlunoResponsavel)
    private readonly vinculoRepo: Repository<AlunoResponsavel>,
  ) {}

  // ── criarOuVincular() ─────────────────────────────────────────────────────
  /**
   * Operação principal de cadastro.
   * 1. Se já existe um Responsavel com o mesmo e-mail, reutiliza o registro.
   * 2. Caso contrário, cria um novo Responsavel.
   * 3. Cria o vínculo (AlunoResponsavel) com o alunoId informado.
   *
   * Isso elimina a duplicação de dados pessoais quando dois irmãos
   * têm o mesmo responsável (ex: a mesma mãe cadastrada para filhos A e B).
   */
  async criarOuVincular(dto: CreateResponsavelDto): Promise<{ responsavel: Responsavel; vinculo: AlunoResponsavel }> {
    // 1. Deduplicar por e-mail
    let responsavel = await this.respRepo.findOne({ where: { email: dto.email } });

    if (!responsavel) {
      responsavel = await this.respRepo.save(
        this.respRepo.create({ nome: dto.nome, email: dto.email, telefone: dto.telefone }),
      );
    }

    // 2. Verificar se o vínculo já existe
    const vinculoExiste = await this.vinculoRepo.findOne({
      where: { alunoId: dto.alunoId, responsavelId: responsavel.id },
    });
    if (vinculoExiste) {
      throw new ConflictException(
        `Responsável "${responsavel.nome}" já está vinculado a este aluno.`,
      );
    }

    // 3. Criar vínculo
    const vinculo = await this.vinculoRepo.save(
      this.vinculoRepo.create({
        alunoId:             dto.alunoId,
        responsavelId:       responsavel.id,
        parentesco:          dto.parentesco,
        receberNotificacoes: dto.receberNotificacoes ?? true,
        validadoEm:          null,
      }),
    );

    return { responsavel, vinculo };
  }

  // ── vincularExistente() ───────────────────────────────────────────────────
  /**
   * Vincula um Responsavel já cadastrado a um aluno adicional.
   * Usado quando a secretaria cadastra um irmão e informa
   * o UUID do responsável já existente no sistema.
   */
  async vincularExistente(responsavelId: string, dto: VincularResponsavelDto): Promise<AlunoResponsavel> {
    const responsavel = await this.buscarPorId(responsavelId);

    const vinculoExiste = await this.vinculoRepo.findOne({
      where: { alunoId: dto.alunoId, responsavelId: responsavel.id },
    });
    if (vinculoExiste) {
      throw new ConflictException(
        `Responsável "${responsavel.nome}" já está vinculado a este aluno.`,
      );
    }

    return this.vinculoRepo.save(
      this.vinculoRepo.create({
        alunoId:             dto.alunoId,
        responsavelId:       responsavel.id,
        parentesco:          dto.parentesco,
        receberNotificacoes: dto.receberNotificacoes ?? true,
        validadoEm:          null,
      }),
    );
  }

  // ── listarPorAluno() ──────────────────────────────────────────────────────
  /** Retorna os responsáveis de um aluno com dados da pessoa e do vínculo. */
  listarPorAluno(alunoId: string): Promise<AlunoResponsavel[]> {
    return this.vinculoRepo.find({
      where:     { alunoId },
      relations: ['responsavel'],
      order:     { parentesco: 'ASC' },
    });
  }

  // ── buscarPorId() ─────────────────────────────────────────────────────────
  async buscarPorId(id: string): Promise<Responsavel> {
    const r = await this.respRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Responsável não encontrado');
    return r;
  }

  // ── atualizarPessoal() ────────────────────────────────────────────────────
  /**
   * Atualiza dados da pessoa (nome, e-mail, telefone).
   * Como há apenas um registro por pessoa, a alteração reflete
   * automaticamente em todos os vínculos deste responsável.
   */
  async atualizarPessoal(id: string, dto: UpdateResponsavelDto): Promise<Responsavel> {
    const responsavel = await this.buscarPorId(id);
    Object.assign(responsavel, dto);
    return this.respRepo.save(responsavel);
  }

  // ── atualizarVinculo() ────────────────────────────────────────────────────
  /** Atualiza campos do vínculo (parentesco, receberNotificacoes). */
  async atualizarVinculo(responsavelId: string, alunoId: string, dto: UpdateVinculoDto): Promise<AlunoResponsavel> {
    const vinculo = await this.vinculoRepo.findOne({
      where: { responsavelId, alunoId },
    });
    if (!vinculo) throw new NotFoundException('Vínculo não encontrado');
    Object.assign(vinculo, dto);
    return this.vinculoRepo.save(vinculo);
  }

  // ── removerVinculo() ─────────────────────────────────────────────────────
  /** Remove apenas o vínculo — não exclui o Responsavel (pode ter outros alunos). */
  async removerVinculo(responsavelId: string, alunoId: string): Promise<void> {
    const vinculo = await this.vinculoRepo.findOne({
      where: { responsavelId, alunoId },
    });
    if (!vinculo) throw new NotFoundException('Vínculo não encontrado');
    await this.vinculoRepo.delete({ responsavelId, alunoId });
  }

  // ── listarAtivosParaNotificacao() ─────────────────────────────────────────
  /**
   * Retorna os Responsaveis com receberNotificacoes=true para o aluno.
   * Usado pelo NotificacoesService.
   *
   * Retorna Responsavel[] (com email, nome, id) — sem duplicatas,
   * pois cada pessoa existe uma única vez na tabela responsaveis.
   */
  async listarAtivosParaNotificacao(alunoId: string): Promise<Responsavel[]> {
    const vinculos = await this.vinculoRepo.find({
      where:     { alunoId, receberNotificacoes: true },
      relations: ['responsavel'],
    });
    return vinculos.map(v => v.responsavel);
  }
}
