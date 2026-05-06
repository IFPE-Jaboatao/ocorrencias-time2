'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { relatoriosApi, type FiltrosRelatorio, type ResumoRelatorio } from '@/lib/api/relatorios.api';
import {
  BarChart3, Download, Search, AlertTriangle, Clock,
  CheckCircle2, Archive, Activity, BookOpen, Tag,
} from 'lucide-react';

const STATUS_LABEL: Record<string, string> = {
  ABERTA:               'Aberta',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  EM_ACOMPANHAMENTO:    'Em Acompanhamento',
  RESOLVIDA:            'Resolvida',
  ARQUIVADA:            'Arquivada',
  REVISAO:              'Revisão',
};

const STATUS_COR: Record<string, string> = {
  ABERTA:               'bg-blue-500',
  AGUARDANDO_VALIDACAO: 'bg-amber-500',
  EM_ACOMPANHAMENTO:    'bg-purple-500',
  RESOLVIDA:            'bg-green-500',
  ARQUIVADA:            'bg-gray-400',
  REVISAO:              'bg-orange-500',
};

const SEV_LABEL: Record<string, string> = {
  '1': 'Informativa',
  '2': 'Leve',
  '3': 'Moderada',
  '4': 'Grave',
  '5': 'Gravíssima',
};

const SEV_COR: Record<string, string> = {
  '1': 'bg-gray-400',
  '2': 'bg-blue-500',
  '3': 'bg-yellow-500',
  '4': 'bg-orange-500',
  '5': 'bg-red-600',
};

const SEG_LABEL: Record<string, string> = {
  FUNDAMENTAL: 'Fundamental',
  MEDIO:       'Médio',
  SUPERIOR:    'Superior',
};

function BarRow({ label, value, total, cor }: { label: string; value: number; total: number; cor: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
      <span className="text-xs text-gray-400 w-8">{pct}%</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, cor }: {
  icon: React.ElementType; label: string; value: number | string;
  sub?: string; cor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cor}`}>
          <Icon size={17} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function initFiltros(): FiltrosRelatorio {
  const hoje   = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  return { dataInicio: inicio, dataFim: hoje.toISOString().slice(0, 10) };
}

export default function RelatoriosPage() {
  const [filtros, setFiltros]     = useState<FiltrosRelatorio>(initFiltros());
  const [applied, setApplied]     = useState<FiltrosRelatorio>(initFiltros());
  const [exporting, setExporting] = useState(false);

  const { data: resumo, isLoading, isError, refetch } = useQuery<ResumoRelatorio>({
    queryKey: ['relatorios', 'resumo', applied],
    queryFn:  () => relatoriosApi.resumo(applied),
  });

  function aplicarFiltros() {
    setApplied({ ...filtros });
  }

  async function handleExportar() {
    setExporting(true);
    try {
      await relatoriosApi.exportarCsv(applied);
    } catch (e) {
      console.error(e);
    } finally {
      setExporting(false);
    }
  }

  const totalForBar = resumo?.totalOcorrencias ?? 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={22} className="text-gray-400" />
            Relatórios
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">Análise e exportação de ocorrências</p>
        </div>
        {resumo && resumo.totalOcorrencias > 0 && (
          <button
            onClick={handleExportar}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors disabled:opacity-60"
          >
            <Download size={15} className={exporting ? 'animate-bounce' : ''} />
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Filtros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data início</label>
            <input
              type="date"
              value={filtros.dataInicio ?? ''}
              onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value || undefined }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Data fim</label>
            <input
              type="date"
              value={filtros.dataFim ?? ''}
              onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value || undefined }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
            <select
              value={filtros.status ?? ''}
              onChange={e => setFiltros(f => ({ ...f, status: e.target.value || undefined }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Severidade</label>
            <select
              value={filtros.severidade ?? ''}
              onChange={e => setFiltros(f => ({ ...f, severidade: e.target.value ? Number(e.target.value) : undefined }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {SEV_LABEL[String(n)]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Segmento</label>
            <select
              value={filtros.segmento ?? ''}
              onChange={e => setFiltros(f => ({ ...f, segmento: e.target.value || undefined }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {Object.entries(SEG_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={aplicarFiltros}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Search size={13} />
              Aplicar
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
          <AlertTriangle size={28} className="text-red-300 mx-auto mb-2" />
          <p className="text-red-600 text-sm">Falha ao carregar o relatório.</p>
          <button onClick={() => refetch()} className="mt-2 text-xs text-red-400 hover:text-red-600">
            Tentar novamente
          </button>
        </div>
      ) : resumo ? (
        <div className="space-y-5">

          {/* Cards de totais */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Activity}      label="Total"         value={resumo.totalOcorrencias} sub="no período selecionado" cor="bg-slate-700" />
            <StatCard icon={AlertTriangle} label="Em aberto"     value={(resumo.porStatus['ABERTA'] ?? 0) + (resumo.porStatus['AGUARDANDO_VALIDACAO'] ?? 0)} sub="Abertas + Aguardando" cor="bg-amber-500" />
            <StatCard icon={CheckCircle2}  label="Resolvidas"    value={resumo.porStatus['RESOLVIDA'] ?? 0} sub="no período" cor="bg-green-600" />
            <StatCard icon={Clock}         label="SLA Vencidas"  value={resumo.slaVencidas} sub="sem resolução no prazo" cor="bg-red-500" />
          </div>

          {resumo.totalOcorrencias === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 text-center">
              <BarChart3 size={32} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Nenhuma ocorrência encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Por status */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Activity size={15} className="text-gray-400" />
                  Distribuição por Status
                </h3>
                <div className="space-y-3">
                  {Object.entries(resumo.porStatus).map(([status, count]) => (
                    <BarRow
                      key={status}
                      label={STATUS_LABEL[status] ?? status}
                      value={count}
                      total={totalForBar}
                      cor={STATUS_COR[status] ?? 'bg-gray-400'}
                    />
                  ))}
                </div>
              </div>

              {/* Por severidade */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-gray-400" />
                  Distribuição por Severidade
                </h3>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(n => {
                    const count = resumo.porSeveridade[String(n)] ?? 0;
                    if (count === 0) return null;
                    return (
                      <BarRow
                        key={n}
                        label={`${n} — ${SEV_LABEL[String(n)]}`}
                        value={count}
                        total={totalForBar}
                        cor={SEV_COR[String(n)]}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Por segmento */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <BookOpen size={15} className="text-gray-400" />
                  Distribuição por Segmento
                </h3>
                <div className="space-y-3">
                  {Object.entries(resumo.porSegmento).map(([seg, count]) => (
                    <BarRow
                      key={seg}
                      label={SEG_LABEL[seg] ?? seg}
                      value={count}
                      total={totalForBar}
                      cor="bg-indigo-500"
                    />
                  ))}
                </div>
              </div>

              {/* Por categoria */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Tag size={15} className="text-gray-400" />
                  Distribuição por Categoria
                </h3>
                <div className="space-y-3">
                  {resumo.porCategoria.map(({ nome, total }) => (
                    <BarRow
                      key={nome}
                      label={nome}
                      value={total}
                      total={totalForBar}
                      cor="bg-teal-500"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rodapé de exportação */}
          {resumo.totalOcorrencias > 0 && (
            <div className="flex items-center justify-between bg-gray-50 rounded-2xl border border-gray-100 px-6 py-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {resumo.totalOcorrencias} ocorrência{resumo.totalOcorrencias !== 1 ? 's' : ''} no relatório
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  O arquivo CSV pode ser aberto no Excel, Google Sheets ou LibreOffice Calc.
                </p>
              </div>
              <button
                onClick={handleExportar}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 shadow-sm transition-colors disabled:opacity-60"
              >
                <Download size={15} className={exporting ? 'animate-bounce' : ''} />
                {exporting ? 'Exportando...' : 'Baixar CSV'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
