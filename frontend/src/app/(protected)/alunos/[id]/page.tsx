'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowLeft, Edit2, Save, X, ArrowRight,
  GraduationCap, Calendar, MapPin, BookOpen,
  Users, AlertTriangle,
} from 'lucide-react';
import { alunosApi } from '@/lib/api/alunos.api';
import { ocorrenciasApi } from '@/lib/api/ocorrencias.api';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { SlaIndicator } from '@/components/ocorrencias/SlaIndicator';
import { getCurrentUser } from '@/lib/auth/session';
import type { Ocorrencia } from '@/types/ocorrencia.types';
import { STATUS_LABELS, STATUS_CORES } from '@/lib/constants/ocorrencia.constants';

const SEGMENTO_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Ensino Fundamental',
  MEDIO:       'Ensino Médio',
  SUPERIOR:    'Ensino Superior',
};
const STATUS_ALUNO_LABEL: Record<string, string> = {
  ATIVO: 'Ativo', INATIVO: 'Inativo', TRANSFERIDO: 'Transferido', FORMADO: 'Formado',
};
const STATUS_ALUNO_COR: Record<string, string> = {
  ATIVO:       'bg-green-100 text-green-700',
  INATIVO:     'bg-gray-100 text-gray-600',
  TRANSFERIDO: 'bg-yellow-100 text-yellow-700',
  FORMADO:     'bg-blue-100 text-blue-700',
};

export default function AlunoDetalhePage() {
  const { id }   = useParams<{ id: string }>();
  const router   = useRouter();
  const qc       = useQueryClient();
  const user     = getCurrentUser();
  const podeEditar = user?.perfil === 'ADMIN' || user?.perfil === 'SECRETARIA';

  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState<{
    nome: string; campus: string; curso: string; turma: string; status: string;
  }>({ nome: '', campus: '', curso: '', turma: '', status: '' });

  const { data: aluno, isLoading, isError } = useQuery({
    queryKey: ['aluno', id],
    queryFn: () => alunosApi.buscarPorId(id),
    enabled: !!id,
  });

  const { data: ocorrencias } = useQuery({
    queryKey: ['ocorrencias-aluno', id],
    queryFn: () => ocorrenciasApi.listar({ alunoId: id, pageSize: 50 }),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: () => alunosApi.atualizar(id, editForm as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['aluno', id] });
      setEditando(false);
    },
  });

  function startEdit() {
    if (!aluno) return;
    setEditForm({ nome: aluno.nome, campus: aluno.campus, curso: aluno.curso, turma: aluno.turma, status: aluno.status });
    setEditando(true);
  }

  function calcularIdade(dataNascimento: string) {
    return differenceInYears(new Date(), parseISO(dataNascimento));
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-100 rounded" />
        <div className="bg-white rounded-2xl border border-gray-100 h-48" />
      </div>
    );
  }

  if (isError || !aluno) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center">
          <p className="text-red-700 font-medium">Aluno não encontrado.</p>
          <Link href="/alunos" className="mt-3 inline-block text-sm text-blue-600 hover:text-blue-800">
            ← Voltar para lista
          </Link>
        </div>
      </div>
    );
  }

  const idade  = calcularIdade(aluno.dataNascimento);
  const iniciais = aluno.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const ocs    = ocorrencias?.data ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center gap-3">
        <Link href="/alunos" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Ficha do Aluno</h1>
      </div>

      {/* ── Card do Aluno ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

          {/* Avatar + info básica */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {iniciais}
            </div>
            {editando ? (
              <div className="space-y-2 flex-1">
                <input
                  type="text"
                  value={editForm.nome}
                  onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{aluno.nome}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_ALUNO_COR[aluno.status] ?? ''}`}>
                    {STATUS_ALUNO_LABEL[aluno.status] ?? aluno.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 font-mono">Matrícula: {aluno.matricula}</p>
              </div>
            )}
          </div>

          {/* Botões editar/salvar */}
          {podeEditar && (
            <div className="flex gap-2">
              {editando ? (
                <>
                  <button
                    onClick={() => setEditando(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <X size={14} /> Cancelar
                  </button>
                  <button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  >
                    <Save size={14} /> {updateMutation.isPending ? 'Salvando…' : 'Salvar'}
                  </button>
                </>
              ) : (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Edit2 size={14} /> Editar
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Detalhes ── */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <Calendar size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Nascimento</p>
              <p className="text-sm font-medium text-gray-700">
                {format(parseISO(aluno.dataNascimento), 'dd/MM/yyyy', { locale: ptBR })}
                <span className="text-gray-400 ml-1">({idade} anos)</span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <GraduationCap size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Segmento</p>
              <p className="text-sm font-medium text-gray-700">{SEGMENTO_LABEL[aluno.segmento] ?? aluno.segmento}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Campus</p>
              {editando ? (
                <input
                  type="text"
                  value={editForm.campus}
                  onChange={e => setEditForm(f => ({ ...f, campus: e.target.value }))}
                  className="w-full rounded border border-gray-200 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm font-medium text-gray-700">{aluno.campus}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <BookOpen size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Turma</p>
              {editando ? (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={editForm.curso}
                    onChange={e => setEditForm(f => ({ ...f, curso: e.target.value }))}
                    placeholder="Curso"
                    className="w-full rounded border border-gray-200 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={editForm.turma}
                    onChange={e => setEditForm(f => ({ ...f, turma: e.target.value }))}
                    placeholder="Turma"
                    className="w-full rounded border border-gray-200 px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <p className="text-sm font-medium text-gray-700">{aluno.turma} — {aluno.curso}</p>
              )}
            </div>
          </div>
        </div>

        {editando && (
          <div className="mt-4">
            <label className="block text-xs text-gray-400 mb-1">Status do aluno</label>
            <select
              value={editForm.status}
              onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
              <option value="TRANSFERIDO">Transferido</option>
              <option value="FORMADO">Formado</option>
            </select>
          </div>
        )}
      </div>

      {/* ── Histórico de Ocorrências ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <h3 className="font-semibold text-gray-800">Histórico de Ocorrências</h3>
            {ocs.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                {ocs.length}
              </span>
            )}
          </div>
          <Link
            href={`/ocorrencias/nova?alunoId=${aluno.id}`}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            + Nova ocorrência
          </Link>
        </div>

        {ocs.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Nenhuma ocorrência registrada para este aluno.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-50 text-sm">
            <thead>
              <tr className="bg-gray-50/80">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Data</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Severidade</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">SLA</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ocs.map((oc: Ocorrencia) => (
                <tr key={oc.id} className="hover:bg-blue-50/20 transition-colors group">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {oc.codigo}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600 hidden sm:table-cell">
                    {format(parseISO(oc.dataIncidente), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                  <td className="px-5 py-3">
                    <SeveridadeBadge severidade={oc.severidade} />
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_CORES[oc.status]}`}>
                      {STATUS_LABELS[oc.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/ocorrencias/${oc.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Ver <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
