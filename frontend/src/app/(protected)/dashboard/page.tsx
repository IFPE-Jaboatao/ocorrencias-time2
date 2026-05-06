'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, Clock, CheckCircle2, AlertCircle,
  TrendingUp, Shield, Plus, ArrowRight, Activity,
} from 'lucide-react';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { useCurrentUser } from '@/lib/hooks/useCurrentUser';
import { SeveridadeBadge } from '@/components/ocorrencias/SeveridadeBadge';
import Link from 'next/link';

interface StatCardProps {
  label:    string;
  value:    number;
  icon:     React.ElementType;
  color:    string;
  bg:       string;
  href?:    string;
}

function StatCard({ label, value, icon: Icon, color, bg, href }: StatCardProps) {
  const content = (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        {href && <ArrowRight size={15} className="text-gray-300" />}
      </div>
      <p className={`mt-4 text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-sm text-gray-500">{label}</p>
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

const SEV_LABELS: Record<number, string> = {
  1: 'Informativa',
  2: 'Leve',
  3: 'Moderada',
  4: 'Grave',
  5: 'Gravíssima',
};

export default function DashboardPage() {
  const user = useCurrentUser();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn:  dashboardApi.resumo,
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Bem-vindo, <span className="font-medium text-gray-700">{user?.nome}</span>
            {user?.campus && <span className="text-gray-400"> · {user.campus}</span>}
          </p>
        </div>
        <Link
          href="/ocorrencias/nova"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          Nova ocorrência
        </Link>
      </div>

      {/* ── Loading / Error ── */}
      {isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-32 animate-pulse">
              <div className="w-11 h-11 bg-gray-100 rounded-xl" />
              <div className="mt-4 w-12 h-7 bg-gray-100 rounded" />
              <div className="mt-1.5 w-28 h-4 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5 text-sm text-red-700">
          Não foi possível carregar os dados do dashboard. Tente novamente.
        </div>
      )}

      {data && (
        <>
          {/* ── Cards de estatísticas ── */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Total de ocorrências" value={data.total}
              icon={Activity}        color="text-gray-700"  bg="bg-gray-100"
              href="/ocorrencias"
            />
            <StatCard
              label="Abertas"             value={data.abertas}
              icon={AlertCircle}     color="text-blue-600"  bg="bg-blue-50"
              href="/ocorrencias?status=ABERTA"
            />
            <StatCard
              label="Aguardando validação" value={data.aguardandoValidacao}
              icon={Clock}           color="text-amber-600" bg="bg-amber-50"
              href="/ocorrencias?status=AGUARDANDO_VALIDACAO"
            />
            <StatCard
              label="Em acompanhamento"   value={data.emAcompanhamento}
              icon={TrendingUp}      color="text-purple-600" bg="bg-purple-50"
              href="/ocorrencias?status=EM_ACOMPANHAMENTO"
            />
            <StatCard
              label="Resolvidas hoje"     value={data.resolvidasHoje}
              icon={CheckCircle2}    color="text-green-600" bg="bg-green-50"
            />
            <StatCard
              label="SLA vencidas"        value={data.slaVencidas}
              icon={AlertTriangle}   color="text-red-600"   bg="bg-red-50"
              href="/ocorrencias"
            />
          </div>

          {/* ── Distribuição por severidade ── */}
          {data.porSeveridade && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield size={17} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">Distribuição por severidade</h2>
              </div>
              <div className="space-y-3">
                {([1, 2, 3, 4, 5] as const).map(sev => {
                  const count = data.porSeveridade?.[sev] ?? 0;
                  const total = data.total || 1;
                  const pct   = Math.round((count / total) * 100);
                  const barColors = ['bg-gray-300', 'bg-blue-300', 'bg-yellow-400', 'bg-orange-400', 'bg-red-500'];
                  return (
                    <div key={sev} className="flex items-center gap-3">
                      <div className="w-24 flex-shrink-0">
                        <SeveridadeBadge severidade={sev} />
                      </div>
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${barColors[sev - 1]}`}
                          style={{ width: count > 0 ? `${Math.max(pct, 3)}%` : '0%' }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ações rápidas ── */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/ocorrencias"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
            >
              <AlertTriangle size={16} className="text-gray-400" />
              Ver todas as ocorrências
            </Link>
            <Link
              href="/ocorrencias/nova"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus size={16} />
              Registrar ocorrência
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
