'use client';

import { useState, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useOcorrencias } from '@/lib/hooks/useOcorrencias';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { SlaIndicator } from '@/components/ocorrencias/SlaIndicator';
import { categoriasApi } from '@/lib/api/categorias.api';
import Link from 'next/link';
import type { StatusOcorrencia, Ocorrencia } from '@/types/ocorrencia.types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Filter, ChevronLeft, ChevronRight, ArrowRight, FileX, TriangleAlert, X } from 'lucide-react';
import { STATUS_LABELS, STATUS_CORES } from '@/lib/constants/ocorrencia.constants';

/** RN-03: detecta reincidência dentro dos dados carregados na página */
function detectarReincidentes(ocorrencias: Ocorrencia[]): Set<string> {
  const contagem = new Map<string, string[]>(); // chave: alunoId__categoriaId → ids
  for (const oc of ocorrencias) {
    const key = `${oc.alunoId}__${oc.categoriaId}`;
    const ids = contagem.get(key) ?? [];
    ids.push(oc.id);
    contagem.set(key, ids);
  }
  const reincidentes = new Set<string>();
  for (const ids of contagem.values()) {
    if (ids.length >= 3) ids.forEach(id => reincidentes.add(id));
  }
  return reincidentes;
}

function OcorrenciasContent() {
  const searchParams                   = useSearchParams();
  const [page, setPage]               = useState(1);
  const [filterStatus, setStatus]     = useState(searchParams.get('status') ?? '');
  const [filterSev, setSev]           = useState(searchParams.get('severidade') ?? '');
  const [filterCatId, setCatId]       = useState(searchParams.get('categoriaId') ?? '');
  const [filterSubId, setSubId]       = useState(searchParams.get('subcategoriaId') ?? '');
  const [filterInicio, setInicio]     = useState(searchParams.get('dataInicio') ?? '');
  const [filterFim, setFim]           = useState(searchParams.get('dataFim') ?? '');

  const { data: categorias } = useQuery({
    queryKey: ['categorias'],
    queryFn:  categoriasApi.listar,
    staleTime: 5 * 60_000,
  });

  const catSelecionada = categorias?.find(c => c.id === filterCatId);

  function limparFiltros() {
    setStatus(''); setSev(''); setCatId(''); setSubId('');
    setInicio(''); setFim(''); setPage(1);
  }

  const temFiltro = filterStatus || filterSev || filterCatId || filterSubId || filterInicio || filterFim;

  const { data, isLoading, isError } = useOcorrencias({
    page,
    pageSize:      20,
    status:        filterStatus    || undefined,
    severidade:    filterSev       ? Number(filterSev) : undefined,
    categoriaId:   filterCatId     || undefined,
    subcategoriaId: filterSubId    || undefined,
    dataInicio:    filterInicio    || undefined,
    dataFim:       filterFim       || undefined,
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ocorrências</h1>
          {data && (
            <p className="text-sm text-gray-500 mt-0.5">{data.total} registro{data.total !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Nova ocorrência
        </Link>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-400">
            <Filter size={15} />
            <span className="text-xs font-medium">Filtros</span>
          </div>
          {temFiltro && (
            <button
              onClick={limparFiltros}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Status */}
          <select
            value={filterStatus}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABELS) as StatusOcorrencia[]).map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Severidade */}
          <select
            value={filterSev}
            onChange={e => { setSev(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as severidades</option>
            {[1, 2, 3, 4, 5].map(s => (
              <option key={s} value={s}>Severidade {s}</option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={filterCatId}
            onChange={e => { setCatId(e.target.value); setSubId(''); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as categorias</option>
            {categorias?.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>

          {/* Subcategoria — só aparece se categoria selecionada tem subcategorias */}
          {catSelecionada && catSelecionada.subcategorias.length > 0 && (
            <select
              value={filterSubId}
              onChange={e => { setSubId(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as subcategorias</option>
              {catSelecionada.subcategorias.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Datas */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs text-gray-400">Período:</span>
          <input
            type="date"
            value={filterInicio}
            onChange={e => { setInicio(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-gray-400">até</span>
          <input
            type="date"
            value={filterFim}
            onChange={e => { setFim(e.target.value); setPage(1); }}
            min={filterInicio || undefined}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* ── Estados de loading/error ── */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-20 animate-pulse">
              <div className="flex gap-4">
                <div className="w-28 h-4 bg-gray-100 rounded" />
                <div className="w-20 h-4 bg-gray-100 rounded" />
                <div className="w-16 h-6 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-sm text-red-700">
          Erro ao carregar ocorrências. Tente novamente.
        </div>
      )}

      {data && (() => {
        const reincidentes = detectarReincidentes(data.data);
        return (
        <>
          {/* ── Tabela desktop ── */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Categoria</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Severidade</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SLA</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FileX size={32} className="text-gray-200" />
                        <p className="text-gray-400 text-sm">Nenhuma ocorrência encontrada.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {data.data.map(oc => (
                  <tr key={oc.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {oc.codigo}
                        </span>
                        {reincidentes.has(oc.id) && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 ring-1 ring-inset ring-red-200 px-1.5 py-0.5 rounded-full" title="Alerta de reincidência (RN-03)">
                            <TriangleAlert size={10} /> Reincidência
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      <div>
                        <span className="text-sm text-gray-800">{oc.categoria?.nome ?? '—'}</span>
                        {oc.subcategoria && (
                          <p className="text-xs text-gray-400 mt-0.5">{oc.subcategoria}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-sm">
                      {format(parseISO(oc.dataIncidente), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-5 py-4">
                      <SeveridadeBadge severidade={oc.severidade} />
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_CORES[oc.status]}`}>
                        {STATUS_LABELS[oc.status]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
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
          </div>

          {/* ── Cards mobile ── */}
          <div className="md:hidden space-y-3">
            {data.data.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                <FileX size={32} className="text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">Nenhuma ocorrência encontrada.</p>
              </div>
            )}
            {data.data.map(oc => (
              <Link key={oc.id} href={`/ocorrencias/${oc.id}`}>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3 active:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {oc.codigo}
                      </span>
                      {oc.categoria?.nome && (
                        <p className="text-xs text-gray-500 mt-1.5">{oc.categoria.nome}{oc.subcategoria ? ` · ${oc.subcategoria}` : ''}</p>
                      )}
                    </div>
                    <SeveridadeBadge severidade={oc.severidade} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_CORES[oc.status]}`}>
                      {STATUS_LABELS[oc.status]}
                    </span>
                    <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{format(parseISO(oc.dataIncidente), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                    <ArrowRight size={14} className="text-gray-300" />
                  </div>
                </div>
              </Link>
            ))}
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
      );
    })()}

    </div>
  );
}

export default function OcorrenciasPage() {
  return (
    <Suspense>
      <OcorrenciasContent />
    </Suspense>
  );
}
