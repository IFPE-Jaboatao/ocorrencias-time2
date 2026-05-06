'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOcorrencia } from '@/lib/hooks/useOcorrencias';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { SlaIndicator } from '@/components/ocorrencias/SlaIndicator';
import { ocorrenciasApi } from '@/lib/api/ocorrencias.api';
import { validacoesApi, type TipoDecisao } from '@/lib/api/validacoes.api';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, MapPin, Calendar, FileText, ShieldCheck, CheckCircle2, RotateCcw, ArrowUpCircle, AlertCircle } from 'lucide-react';
import type { StatusOcorrencia } from '@/types/ocorrencia.types';

const STATUS_LABELS: Record<StatusOcorrencia, string> = {
  ABERTA:               'Aberta',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  EM_ACOMPANHAMENTO:    'Em Acompanhamento',
  RESOLVIDA:            'Resolvida',
  ARQUIVADA:            'Arquivada',
  REVISAO:              'Revisão',
};

const STATUS_CORES: Record<StatusOcorrencia, string> = {
  ABERTA:               'bg-blue-50 text-blue-700 ring-blue-200',
  AGUARDANDO_VALIDACAO: 'bg-amber-50 text-amber-700 ring-amber-200',
  EM_ACOMPANHAMENTO:    'bg-purple-50 text-purple-700 ring-purple-200',
  RESOLVIDA:            'bg-green-50 text-green-700 ring-green-200',
  ARQUIVADA:            'bg-gray-100 text-gray-500 ring-gray-200',
  REVISAO:              'bg-orange-50 text-orange-700 ring-orange-200',
};

const CIENCIA_CORES: Record<string, string> = {
  PENDENTE:   'text-gray-400',
  ENVIADA:    'text-amber-500',
  CONFIRMADA: 'text-green-600',
  EXPIRADA:   'text-red-500',
};

function InfoField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-gray-800">{children}</div>
    </div>
  );
}

export default function OcorrenciaDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const user    = useCurrentUser();
  const qc      = useQueryClient();

  const { data: oc, isLoading, isError } = useOcorrencia(id);

  const [showValidar, setShowValidar] = useState(false);
  const [decisao, setDecisao]         = useState<TipoDecisao>('VALIDAR');
  const [justificativa, setJust]      = useState('');
  const [validError, setValidError]   = useState('');
  const [showStatus, setShowStatus]   = useState(false);
  const [novoStatus, setNovoStatus]   = useState<StatusOcorrencia>('EM_ACOMPANHAMENTO');
  const [justStatus, setJustStatus]   = useState('');
  const [statusError, setStatusError] = useState('');

  const validarMut = useMutation({
    mutationFn: () => validacoesApi.validar(id, { tipoDecisao: decisao, justificativa }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencia', id] });
      setShowValidar(false);
      setJust('');
      setValidError('');
    },
    onError: (e: unknown) => setValidError(e instanceof Error ? e.message : 'Erro ao validar.'),
  });

  const alterarStatusMut = useMutation({
    mutationFn: () => ocorrenciasApi.alterarStatus(id, novoStatus, justStatus || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencia', id] });
      setShowStatus(false);
      setJustStatus('');
      setStatusError('');
    },
    onError: (e: unknown) => setStatusError(e instanceof Error ? e.message : 'Erro ao alterar status.'),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isError || !oc) return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl bg-red-50 border border-red-100 p-8 text-center">
        <AlertCircle size={32} className="text-red-300 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Ocorrência não encontrada.</p>
        <button onClick={() => router.back()} className="mt-3 text-sm text-red-400 hover:text-red-600">
          Voltar
        </button>
      </div>
    </div>
  );

  const podValidar = user && ['COORDENADOR', 'DIRETOR', 'ADMIN'].includes(user.perfil)
    && oc.status === 'AGUARDANDO_VALIDACAO';
  const podAlterarStatus = user && ['COORDENADOR', 'DIRETOR', 'ADMIN'].includes(user.perfil)
    && oc.status !== 'ARQUIVADA';

  const DECISAO_CONFIG = [
    { value: 'VALIDAR' as TipoDecisao,  label: 'Validar',  icon: CheckCircle2,   cor: 'bg-green-600 text-white border-green-600' },
    { value: 'DEVOLVER' as TipoDecisao, label: 'Devolver', icon: RotateCcw,      cor: 'bg-amber-500 text-white border-amber-500' },
    { value: 'ESCALAR' as TipoDecisao,  label: 'Escalar',  icon: ArrowUpCircle,  cor: 'bg-red-600 text-white border-red-600' },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Breadcrumb ── */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar para ocorrências
      </button>

      {/* ── Card principal ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header do card */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {oc.codigo}
                </span>
                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-inset ${STATUS_CORES[oc.status]}`}>
                  {STATUS_LABELS[oc.status]}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Registrada em {format(parseISO(oc.criadoEm), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <SeveridadeBadge severidade={oc.severidade} />
              <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
            </div>
          </div>
        </div>

        {/* Detalhes */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <InfoField label="Data do incidente">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-gray-400" />
              {format(parseISO(oc.dataIncidente), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
          </InfoField>

          <InfoField label="Local">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-gray-400" />
              {oc.local}
            </div>
          </InfoField>

          <InfoField label="Ciência Formal">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className={CIENCIA_CORES[oc.cienciaFormalStatus] ?? 'text-gray-400'} />
              <span className={CIENCIA_CORES[oc.cienciaFormalStatus] ?? 'text-gray-600'}>
                {oc.cienciaFormalStatus}
              </span>
            </div>
          </InfoField>
        </div>

        {/* Descrição */}
        <div className="px-6 pb-6">
          <InfoField label="Descrição">
            <div className="mt-2 bg-gray-50 rounded-xl p-4">
              <div className="flex gap-2">
                <FileText size={15} className="text-gray-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{oc.descricao}</p>
              </div>
            </div>
          </InfoField>
        </div>

        {/* Ações */}
        {(podValidar || podAlterarStatus) && (
          <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex flex-wrap gap-3">
            {podValidar && (
              <button
                onClick={() => { setShowValidar(v => !v); setShowStatus(false); }}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 shadow-sm transition-colors"
              >
                <CheckCircle2 size={16} />
                Validar / Devolver
              </button>
            )}
            {podAlterarStatus && (
              <button
                onClick={() => { setShowStatus(v => !v); setShowValidar(false); }}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                Alterar status
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Painel de validação ── */}
      {showValidar && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Decisão de Validação</h2>

          <div className="flex gap-3">
            {DECISAO_CONFIG.map(({ value, label, icon: Icon, cor }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDecisao(value)}
                className={`flex items-center gap-2 flex-1 justify-center rounded-xl px-3 py-2.5 text-sm font-medium border transition-all ${
                  decisao === value ? cor : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificativa <span className="text-gray-400 font-normal">(mínimo 30 caracteres)</span>
            </label>
            <textarea
              rows={4}
              placeholder="Descreva a motivação da sua decisão..."
              value={justificativa}
              onChange={e => setJust(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
            />
            <p className="mt-1 text-xs text-gray-400 text-right">{justificativa.length}/1000</p>
          </div>

          {validError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle size={15} />
              {validError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => validarMut.mutate()}
              disabled={validarMut.isPending || justificativa.length < 30}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              {validarMut.isPending ? 'Salvando...' : 'Confirmar decisão'}
            </button>
            <button
              onClick={() => setShowValidar(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Painel de status ── */}
      {showStatus && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Alterar Status</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Novo status</label>
            <select
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value as StatusOcorrencia)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {(Object.keys(STATUS_LABELS) as StatusOcorrencia[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Justificativa <span className="text-gray-400 font-normal">(obrigatória para Resolvida/Arquivada)</span>
            </label>
            <input
              type="text"
              placeholder="Motivo da alteração de status..."
              value={justStatus}
              onChange={e => setJustStatus(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {statusError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              <AlertCircle size={15} />
              {statusError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => alterarStatusMut.mutate()}
              disabled={alterarStatusMut.isPending}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {alterarStatusMut.isPending ? 'Salvando...' : 'Confirmar alteração'}
            </button>
            <button
              onClick={() => setShowStatus(false)}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
