'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { cienciaApi, type CienciaInfo } from '@/lib/api/ciencia.api';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ShieldCheck, CheckCircle2, AlertCircle, Calendar, MapPin, FileText, Loader2 } from 'lucide-react';

export default function CienciaFormalPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo]             = useState<CienciaInfo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [confirming, setConf]       = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [error, setError]           = useState('');

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
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Carregando informações...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 mx-auto">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Link inválido</h2>
            <p className="text-sm text-gray-500 mt-1">{error}</p>
          </div>
          <p className="text-xs text-gray-400">
            Caso precise de ajuda, entre em contato com a instituição.
          </p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const { ocorrencia } = info;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-lg space-y-4">

        {/* ── Branding ── */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 shadow-sm mb-3">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">Radar Acadêmico</h1>
          <p className="text-xs text-gray-500">Sistema de Gestão de Ocorrências Acadêmicas</p>
        </div>

        {/* ── Card principal ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="bg-slate-900 px-6 py-5">
            <h2 className="text-white font-semibold text-base">Ciência Formal de Ocorrência</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Enviado em {format(parseISO(info.dataEnvio), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* Aviso legal */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>Atenção:</strong> Ao confirmar sua ciência, você declara ter tomado conhecimento
                desta ocorrência. Esta ação é registrada e tem validade legal.
              </p>
            </div>

            {/* Dados da ocorrência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Código</span>
                <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {ocorrencia.codigo}
                </span>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Data do incidente</span>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <Calendar size={13} className="text-gray-400" />
                  {format(parseISO(ocorrencia.dataIncidente), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Local</span>
                <div className="flex items-center gap-1.5 text-sm text-gray-700">
                  <MapPin size={13} className="text-gray-400" />
                  {ocorrencia.local}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Severidade</span>
                <SeveridadeBadge severidade={ocorrencia.severidade} />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={13} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Descrição do ocorrido</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                {ocorrencia.descricao}
              </p>
            </div>

            {/* Ação */}
            {confirmed ? (
              <div className="flex items-center justify-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-4">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Ciência confirmada com sucesso</p>
                  <p className="text-xs text-green-600 mt-0.5">Seu registro foi salvo. Obrigado.</p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleConfirmar}
                disabled={confirming}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-colors"
              >
                {confirming
                  ? <><Loader2 size={15} className="animate-spin" /> Confirmando...</>
                  : <><CheckCircle2 size={15} /> Confirmar minha ciência</>
                }
              </button>
            )}

            <p className="text-xs text-gray-400 text-center">
              Destinatário: <strong className="text-gray-500">{info.destinatario}</strong>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          © Radar Acadêmico — Sistema protegido conforme ECA e LGPD
        </p>
      </div>
    </div>
  );
}
