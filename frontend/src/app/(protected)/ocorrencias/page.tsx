'use client';

import { useState } from 'react';
import { useOcorrencias } from '@/lib/hooks/useOcorrencias';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { SlaIndicator } from '@/components/ocorrencias/SlaIndicator';
import Link from 'next/link';
import type { StatusOcorrencia } from '@/types/ocorrencia.types';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABELS: Record<StatusOcorrencia, string> = {
  ABERTA:               'Aberta',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  EM_ACOMPANHAMENTO:    'Em Acompanhamento',
  RESOLVIDA:            'Resolvida',
  ARQUIVADA:            'Arquivada',
  REVISAO:              'Revisão',
};

export default function OcorrenciasPage() {
  const [page, setPage]           = useState(1);
  const [filterStatus, setStatus] = useState('');
  const [filterSev, setSev]       = useState('');

  const { data, isLoading, isError } = useOcorrencias({
    page,
    pageSize: 20,
    status:    filterStatus || undefined,
    severidade: filterSev ? Number(filterSev) : undefined,
  });

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Ocorrências</h1>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nova ocorrência
        </Link>
      </div>

      <div className="flex gap-3">
        <select
          value={filterStatus}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as StatusOcorrencia[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterSev}
          onChange={e => { setSev(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Todas as severidades</option>
          {[1, 2, 3, 4, 5].map(s => (
            <option key={s} value={s}>Severidade {s}</option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Carregando...</p>}
      {isError   && <p className="text-sm text-red-500">Erro ao carregar ocorrências.</p>}

      {data && (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Código</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Severidade</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">SLA</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Nenhuma ocorrência encontrada.
                    </td>
                  </tr>
                )}
                {data.data.map(oc => (
                  <tr key={oc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{oc.codigo}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {format(parseISO(oc.dataIncidente), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <SeveridadeBadge severidade={oc.severidade} />
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {STATUS_LABELS[oc.status]}
                    </td>
                    <td className="px-4 py-3">
                      <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ocorrencias/${oc.id}`}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-gray-500">
                Página {data.page} de {data.totalPages}
              </span>
              <button
                disabled={page === data.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
