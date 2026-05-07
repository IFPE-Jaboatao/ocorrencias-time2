'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Search, Upload, Download, FileX,
  ChevronLeft, ChevronRight, Filter, ArrowRight,
  CheckCircle, AlertCircle, X,
} from 'lucide-react';
import { alunosApi } from '@/lib/api/alunos.api';
import { getCurrentUser } from '@/lib/auth/session';
import type { Aluno } from '@/types/ocorrencia.types';

const SEGMENTO_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Fundamental',
  MEDIO:       'Médio',
  SUPERIOR:    'Superior',
};
const STATUS_LABEL: Record<string, string> = {
  ATIVO:       'Ativo',
  INATIVO:     'Inativo',
  TRANSFERIDO: 'Transferido',
  FORMADO:     'Formado',
};
const STATUS_COR: Record<string, string> = {
  ATIVO:       'bg-green-50 text-green-700 ring-green-200',
  INATIVO:     'bg-gray-50 text-gray-600 ring-gray-200',
  TRANSFERIDO: 'bg-yellow-50 text-yellow-700 ring-yellow-200',
  FORMADO:     'bg-blue-50 text-blue-700 ring-blue-200',
};

interface ImportResult { importados: number; ignorados: number; erros: string[] }

export default function AlunosPage() {
  const user = getCurrentUser();
  const podeEditar = user?.perfil === 'ADMIN' || user?.perfil === 'SECRETARIA';

  const [page, setPage]               = useState(1);
  const [q, setQ]                     = useState('');
  const [filterSeg, setFilterSeg]     = useState('');
  const [filterStatus, setStatus]     = useState('');
  const [showImport, setShowImport]   = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['alunos', page, q, filterSeg, filterStatus],
    queryFn: () => alunosApi.listar({ q, segmento: filterSeg || undefined, status: filterStatus || undefined, page, pageSize: 20 }),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => alunosApi.importar(file),
    onSuccess: (result) => {
      setImportResult(result);
      qc.invalidateQueries({ queryKey: ['alunos'] });
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    importMutation.mutate(file);
  }

  async function handleDownloadTemplate() {
    const blob = await alunosApi.downloadTemplate();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'template_alunos.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  function calcularIdade(dataNascimento: string) {
    const nascimento = parseISO(dataNascimento);
    const hoje       = new Date();
    let idade        = hoje.getFullYear() - nascimento.getFullYear();
    const m          = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--;
    return idade;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alunos</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">
              {data.total} aluno{data.total !== 1 ? 's' : ''} cadastrado{data.total !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {podeEditar && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowImport(v => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <Upload size={15} />
              Importar Excel
            </button>
            <Link
              href="/alunos/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus size={16} />
              Novo Aluno
            </Link>
          </div>
        )}
      </div>

      {/* ── Painel de importação Excel ── */}
      {showImport && podeEditar && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Importação em Lote via Excel</h2>
            <button onClick={() => { setShowImport(false); setImportResult(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Download size={14} />
              Baixar template .xlsx
            </button>
            <span className="text-gray-300">|</span>
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors">
              <Upload size={14} />
              {importMutation.isPending ? 'Importando...' : 'Selecionar arquivo .xlsx'}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={handleFileChange}
                disabled={importMutation.isPending}
              />
            </label>
          </div>

          <p className="text-xs text-gray-400">
            Colunas obrigatórias: <code className="bg-gray-100 px-1 rounded text-gray-600">matricula, nome, dataNascimento (AAAA-MM-DD), segmento, campus, curso, turma</code>
          </p>

          {importResult && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <CheckCircle size={14} /> {importResult.importados} importado{importResult.importados !== 1 ? 's' : ''}
                </span>
                {importResult.ignorados > 0 && (
                  <span className="text-gray-500">{importResult.ignorados} ignorado{importResult.ignorados !== 1 ? 's' : ''} (matrícula duplicada)</span>
                )}
              </div>
              {importResult.erros.length > 0 && (
                <div className="bg-red-50 rounded-xl border border-red-100 p-3 space-y-1">
                  <p className="flex items-center gap-1 text-xs font-semibold text-red-700"><AlertCircle size={13} /> {importResult.erros.length} erro{importResult.erros.length !== 1 ? 's' : ''}</p>
                  {importResult.erros.slice(0, 5).map((e, i) => (
                    <p key={i} className="text-xs text-red-600 pl-4">{e}</p>
                  ))}
                  {importResult.erros.length > 5 && (
                    <p className="text-xs text-red-400 pl-4">... e mais {importResult.erros.length - 5} erro(s)</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Filtros e Busca ── */}
      <div className="flex flex-wrap gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Buscar por nome ou matrícula…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <Filter size={14} />
        </div>
        <select
          value={filterSeg}
          onChange={e => { setFilterSeg(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os segmentos</option>
          <option value="FUNDAMENTAL">Fundamental</option>
          <option value="MEDIO">Médio</option>
          <option value="SUPERIOR">Superior</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
          <option value="TRANSFERIDO">Transferido</option>
          <option value="FORMADO">Formado</option>
        </select>
        {(q || filterSeg || filterStatus) && (
          <button
            onClick={() => { setQ(''); setFilterSeg(''); setStatus(''); setPage(1); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-16 animate-pulse">
              <div className="flex gap-4 items-center">
                <div className="w-9 h-9 bg-gray-100 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-48 h-3 bg-gray-100 rounded" />
                  <div className="w-28 h-3 bg-gray-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-sm text-red-700">
          Erro ao carregar alunos. Tente novamente.
        </div>
      )}

      {/* ── Tabela ── */}
      {data && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aluno</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Matrícula</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Turma</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Segmento</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileX size={32} className="text-gray-200" />
                        <p className="text-gray-400 text-sm">Nenhum aluno encontrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {data.data.map((aluno: Aluno) => {
                  const iniciais = aluno.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
                  const idade    = calcularIdade(aluno.dataNascimento);
                  return (
                    <tr key={aluno.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {iniciais}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{aluno.nome}</p>
                            <p className="text-xs text-gray-400">{idade} anos · {aluno.campus}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-600 hidden sm:table-cell">
                        {aluno.matricula}
                      </td>
                      <td className="px-5 py-4 text-gray-600 hidden md:table-cell">
                        {aluno.curso} — {aluno.turma}
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-xs text-gray-600">{SEGMENTO_LABEL[aluno.segmento] ?? aluno.segmento}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_COR[aluno.status] ?? 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
                          {STATUS_LABEL[aluno.status] ?? aluno.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/alunos/${aluno.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Ver <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Paginação ── */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
              <p className="text-sm text-gray-500">
                Página <span className="font-medium text-gray-700">{data.page}</span> de{' '}
                <span className="font-medium text-gray-700">{data.totalPages}</span>
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={15} /> Anterior
                </button>
                <button
                  disabled={page === data.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
