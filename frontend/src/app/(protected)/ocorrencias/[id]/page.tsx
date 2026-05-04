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
import Link from 'next/link';
import type { StatusOcorrencia } from '@/types/ocorrencia.types';

const STATUS_LABELS: Record<StatusOcorrencia, string> = {
  ABERTA:               'Aberta',
  AGUARDANDO_VALIDACAO: 'Aguardando Validação',
  EM_ACOMPANHAMENTO:    'Em Acompanhamento',
  RESOLVIDA:            'Resolvida',
  ARQUIVADA:            'Arquivada',
  REVISAO:              'Revisão',
};

const CAN_VALIDATE: StatusOcorrencia[] = ['AGUARDANDO_VALIDACAO'];

export default function OcorrenciaDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const user    = useCurrentUser();
  const qc      = useQueryClient();

  const { data: oc, isLoading, isError } = useOcorrencia(id);

  const [showValidar, setShowValidar]   = useState(false);
  const [decisao, setDecisao]           = useState<TipoDecisao>('VALIDAR');
  const [justificativa, setJust]        = useState('');
  const [validError, setValidError]     = useState('');
  const [showStatus, setShowStatus]     = useState(false);
  const [novoStatus, setNovoStatus]     = useState<StatusOcorrencia>('EM_ACOMPANHAMENTO');
  const [justStatus, setJustStatus]     = useState('');
  const [statusError, setStatusError]   = useState('');

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

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>;
  if (isError || !oc) return <p className="text-sm text-red-500">Ocorrência não encontrada.</p>;

  const podValidar = user && ['COORDENADOR', 'DIRETOR', 'ADMIN'].includes(user.perfil)
    && CAN_VALIDATE.includes(oc.status);

  const podAlterarStatus = user && ['COORDENADOR', 'DIRETOR', 'ADMIN'].includes(user.perfil)
    && oc.status !== 'ARQUIVADA';

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">
          ← Voltar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 font-mono">{oc.codigo}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Registrada em {format(parseISO(oc.criadoEm), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SeveridadeBadge severidade={oc.severidade} />
            <SlaIndicator slaPrazo={oc.slaPrazo} status={oc.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
            <p className="mt-0.5 font-medium text-gray-800">{STATUS_LABELS[oc.status]}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Data do incidente</p>
            <p className="mt-0.5 font-medium text-gray-800">
              {format(parseISO(oc.dataIncidente), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Local</p>
            <p className="mt-0.5 font-medium text-gray-800">{oc.local}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Ciência Formal</p>
            <p className="mt-0.5 font-medium text-gray-800">{oc.cienciaFormalStatus}</p>
          </div>
        </div>

        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">Descrição</p>
          <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">{oc.descricao}</p>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          {podValidar && (
            <button
              onClick={() => setShowValidar(v => !v)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Validar / Devolver
            </button>
          )}
          {podAlterarStatus && (
            <button
              onClick={() => setShowStatus(v => !v)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Alterar status
            </button>
          )}
        </div>

        {/* Painel de validação */}
        {showValidar && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-700">Decisão de Validação</h2>
            <div className="flex gap-2">
              {(['VALIDAR', 'DEVOLVER', 'ESCALAR'] as TipoDecisao[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDecisao(d)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium border ${
                    decisao === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              minLength={30}
              placeholder="Justificativa (mínimo 30 caracteres)"
              value={justificativa}
              onChange={e => setJust(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
            {validError && <p className="text-xs text-red-600">{validError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => validarMut.mutate()}
                disabled={validarMut.isPending || justificativa.length < 30}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {validarMut.isPending ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setShowValidar(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Painel de alteração de status */}
        {showStatus && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h2 className="text-sm font-medium text-gray-700">Alterar Status</h2>
            <select
              value={novoStatus}
              onChange={e => setNovoStatus(e.target.value as StatusOcorrencia)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            >
              {(Object.keys(STATUS_LABELS) as StatusOcorrencia[]).map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Justificativa (obrigatória para resolvida/arquivada)"
              value={justStatus}
              onChange={e => setJustStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none"
            />
            {statusError && <p className="text-xs text-red-600">{statusError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => alterarStatusMut.mutate()}
                disabled={alterarStatusMut.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {alterarStatusMut.isPending ? 'Salvando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setShowStatus(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
