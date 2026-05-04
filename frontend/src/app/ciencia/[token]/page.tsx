'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { cienciaApi, type CienciaInfo } from '@/lib/api/ciencia.api';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CienciaFormalPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo]         = useState<CienciaInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [confirming, setConf]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    cienciaApi.buscarPorToken(token)
      .then(data => {
        setInfo(data);
        if (data.confirmado) setConfirmed(true);
      })
      .catch(() => setError('Este link é inválido ou expirou.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleConfirmar() {
    setConf(true);
    try {
      await cienciaApi.confirmar(token);
      setConfirmed(true);
    } catch {
      setError('Não foi possível confirmar. O link pode ter sido utilizado anteriormente.');
    } finally {
      setConf(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Carregando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm p-8 text-center space-y-3">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-500">
            Caso precise de mais informações, entre em contato com a instituição.
          </p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const { ocorrencia } = info;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-white font-semibold">Ciência Formal de Ocorrência</h1>
          <p className="text-blue-100 text-sm mt-0.5">
            Sistema de Gestão de Ocorrências Acadêmicas
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Importante:</strong> Ao confirmar sua ciência, você declara ter tomado conhecimento
            desta ocorrência. Esta ação é registrada e tem validade legal.
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Código</span>
              <span className="font-mono text-sm font-medium">{ocorrencia.codigo}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Data do incidente</span>
              <span className="text-sm">{format(parseISO(ocorrencia.dataIncidente), 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Local</span>
              <span className="text-sm">{ocorrencia.local}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Severidade</span>
              <SeveridadeBadge severidade={ocorrencia.severidade} />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Descrição</p>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
              {ocorrencia.descricao}
            </p>
          </div>

          {confirmed ? (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 text-center">
              <p className="font-medium">Ciência confirmada com sucesso.</p>
              <p className="mt-0.5 text-green-700">Seu registro foi salvo. Obrigado.</p>
            </div>
          ) : (
            <button
              onClick={handleConfirmar}
              disabled={confirming}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? 'Confirmando...' : 'Confirmar minha ciência'}
            </button>
          )}

          <p className="text-xs text-gray-400 text-center">
            Enviado em {format(parseISO(info.dataEnvio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} para {info.destinatario}
          </p>
        </div>
      </div>
    </div>
  );
}
